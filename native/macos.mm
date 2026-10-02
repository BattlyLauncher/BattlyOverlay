#import <Cocoa/Cocoa.h>
#import <CoreGraphics/CoreGraphics.h>
#include <cerrno>
#include <chrono>
#include <csignal>
#include <cstdlib>
#include <iostream>
#include <limits>
#include <thread>

static bool alive(pid_t pid) { return kill(pid, 0) == 0 || errno == EPERM; }
static unsigned long number(const char* text) {
    char* end = nullptr;
    errno = 0;
    auto value = std::strtoul(text, &end, 10);
    return errno || !end || *end || *text == '-' ? 0 : value;
}
int main(int argc, char** argv) {
    if (argc != 4) return 64;
    auto game = number(argv[1]), overlay = number(argv[2]), parent = number(argv[3]);
    if (!game || !parent || game > std::numeric_limits<int>::max() || parent > std::numeric_limits<int>::max()) return 64;
    while (alive(static_cast<pid_t>(game)) && alive(static_cast<pid_t>(parent))) {
        @autoreleasepool {
            // Reads bounds and process IDs, never window contents or titles.
            CFArrayRef raw = CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements, kCGNullWindowID);
            if (!raw) { std::cout << "{\"mode\":\"companion\"}" << std::endl; return 0; }
            NSArray* windows = CFBridgingRelease(raw);
            CGRect selected = CGRectZero;
            bool overlayVisible = false;
            for (NSDictionary* window in windows) {
                if ([window[(id)kCGWindowNumber] unsignedLongValue] == overlay) overlayVisible = true;
                if ([window[(id)kCGWindowOwnerPID] unsignedLongValue] != game || [window[(id)kCGWindowLayer] intValue] != 0) continue;
                CGRect bounds;
                if (CGRectMakeWithDictionaryRepresentation((__bridge CFDictionaryRef)window[(id)kCGWindowBounds], &bounds)
                    && bounds.size.width >= 320 && bounds.size.height >= 200
                    && bounds.size.width * bounds.size.height > selected.size.width * selected.size.height) selected = bounds;
            }
            pid_t active = NSWorkspace.sharedWorkspace.frontmostApplication.processIdentifier;
            bool visible = selected.size.width > 0 && (active == static_cast<pid_t>(game) || (active == static_cast<pid_t>(parent) && overlayVisible));
            CGDirectDisplayID displays[32]; uint32_t count = 0;
            bool fullscreen = false;
            if (CGGetActiveDisplayList(32, displays, &count) == kCGErrorSuccess) {
                for (uint32_t i = 0; i < count; ++i) {
                    auto bounds = CGDisplayBounds(displays[i]);
                    if (CGRectContainsRect(selected, bounds)) fullscreen = true;
                }
            }
            if (selected.size.width > 0) {
                std::cout << "{\"visible\":" << (visible ? "true" : "false")
                    << ",\"fullscreen\":" << (fullscreen ? "true" : "false")
                    << ",\"exclusiveFullscreen\":false,\"x\":" << static_cast<int>(selected.origin.x)
                    << ",\"y\":" << static_cast<int>(selected.origin.y) << ",\"width\":" << static_cast<int>(selected.size.width)
                    << ",\"height\":" << static_cast<int>(selected.size.height) << "}" << std::endl;
            } else std::cout << "{\"visible\":false}" << std::endl;
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(250));
    }
}
