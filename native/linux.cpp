#include <X11/Xlib.h>
#include <X11/Xatom.h>
#include <cerrno>
#include <chrono>
#include <csignal>
#include <cstdlib>
#include <iostream>
#include <limits>
#include <thread>

// Window metadata only. No input hooks, screen capture or process injection.
static bool alive(pid_t pid) { return kill(pid, 0) == 0 || errno == EPERM; }
static unsigned long number(const char* text) {
    char* end = nullptr;
    errno = 0;
    auto value = std::strtoul(text, &end, 10);
    return errno || !end || *end || *text == '-' ? 0 : value;
}
static unsigned long property(Display* display, Window window, Atom key) {
    Atom type; int format; unsigned long count, remaining; unsigned char* data = nullptr;
    unsigned long result = 0;
    if (XGetWindowProperty(display, window, key, 0, 1, False, AnyPropertyType,
        &type, &format, &count, &remaining, &data) == Success && data && format == 32 && count == 1)
        result = *reinterpret_cast<unsigned long*>(data);
    if (data) XFree(data);
    return result;
}
static bool hasState(Display* display, Window window, Atom key, Atom value) {
    Atom type; int format; unsigned long count, remaining; unsigned char* data = nullptr;
    bool found = false;
    if (XGetWindowProperty(display, window, key, 0, 128, False, XA_ATOM,
        &type, &format, &count, &remaining, &data) == Success && data && format == 32) {
        auto values = reinterpret_cast<Atom*>(data);
        for (unsigned long i = 0; i < count; ++i) if (values[i] == value) found = true;
    }
    if (data) XFree(data);
    return found;
}
int main(int argc, char** argv) {
    if (argc != 4) return 64;
    auto game = number(argv[1]), overlay = number(argv[2]), parent = number(argv[3]);
    if (!game || !parent || game > std::numeric_limits<int>::max() || parent > std::numeric_limits<int>::max()) return 64;
    const char* session = std::getenv("XDG_SESSION_TYPE");
    if (std::getenv("WAYLAND_DISPLAY") || (session && std::string(session) == "wayland")) {
        std::cout << "{\"mode\":\"companion\"}" << std::endl;
        return 0;
    }
    Display* display = XOpenDisplay(nullptr);
    if (!display) { std::cout << "{\"mode\":\"companion\"}" << std::endl; return 0; }
    XSetErrorHandler([](Display*, XErrorEvent*) { return 0; });
    auto root = DefaultRootWindow(display);
    auto listKey = XInternAtom(display, "_NET_CLIENT_LIST", False);
    auto pidKey = XInternAtom(display, "_NET_WM_PID", False);
    auto activeKey = XInternAtom(display, "_NET_ACTIVE_WINDOW", False);
    auto stateKey = XInternAtom(display, "_NET_WM_STATE", False);
    auto fullscreenKey = XInternAtom(display, "_NET_WM_STATE_FULLSCREEN", False);
    while (alive(static_cast<pid_t>(game)) && alive(static_cast<pid_t>(parent))) {
        Atom type; int format; unsigned long count, remaining; unsigned char* data = nullptr;
        Window chosen = 0; XWindowAttributes bounds{};
        if (XGetWindowProperty(display, root, listKey, 0, 8192, False, XA_WINDOW,
            &type, &format, &count, &remaining, &data) == Success && data && format == 32) {
            auto windows = reinterpret_cast<Window*>(data);
            for (unsigned long i = 0; i < count; ++i) {
                XWindowAttributes current{};
                if (property(display, windows[i], pidKey) == game && XGetWindowAttributes(display, windows[i], &current)
                    && current.map_state == IsViewable && current.width >= 320 && current.height >= 200
                    && static_cast<long long>(current.width) * current.height > static_cast<long long>(bounds.width) * bounds.height) {
                    chosen = windows[i]; bounds = current;
                }
            }
        }
        if (data) XFree(data);
        int x = 0, y = 0; Window child = 0;
        auto active = property(display, root, activeKey);
        if (chosen && XTranslateCoordinates(display, chosen, root, 0, 0, &x, &y, &child)) {
            std::cout << "{\"visible\":" << ((active == chosen || active == overlay) ? "true" : "false")
                << ",\"fullscreen\":" << (hasState(display, chosen, stateKey, fullscreenKey) ? "true" : "false")
                << ",\"exclusiveFullscreen\":false,\"x\":" << x << ",\"y\":" << y
                << ",\"width\":" << bounds.width << ",\"height\":" << bounds.height << "}" << std::endl;
        } else std::cout << "{\"visible\":false}" << std::endl;
        std::this_thread::sleep_for(std::chrono::milliseconds(250));
    }
    XCloseDisplay(display);
}
