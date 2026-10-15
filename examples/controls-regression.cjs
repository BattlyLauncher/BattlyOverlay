const {app,BrowserWindow,ipcMain,clipboard}=require('electron');
const path=require('node:path'),assert=require('node:assert/strict');
app.disableHardwareAcceleration();
app.setPath('userData',path.join(__dirname,'../build','overlay-controls-qa-'+process.pid));
app.whenReady().then(async()=>{
 const savedClipboard={text:clipboard.readText(),html:clipboard.readHTML(),rtf:clipboard.readRTF(),image:clipboard.readImage()};
 const defaults={opacity:90,position:'top-right',showVoice:true,showPresence:true,animations:false,width:300,height:0,minimal:false,offsetX:0.3,offsetY:0.4};
 let preferences={...defaults},window;
 const snapshot={state:'hosting',code:'ABC123',version:'26.3',address:'',message:'',members:[],participants:[],invites:[],inviteError:'',isPublic:false,roomTitle:''};
 const bridgeOnly=process.argv.includes('--bridge-only'), copied=[];
 const handles={snapshot:()=>snapshot,preferences:()=>preferences,configure:value=>{preferences=value;window.webContents.send('example:preferences',value);},clipboard:async value=>{copied.push(value);if(!bridgeOnly){clipboard.writeText(value);assert.equal(clipboard.readText(),value);}return true;},expand:()=>{}};
 for(const[name,handler]of Object.entries(handles))ipcMain.handle('example:'+name,(_event,...args)=>handler(...args));
 try{
  window=new BrowserWindow({show:false,focusable:false,width:430,height:760,webPreferences:{sandbox:true,contextIsolation:true,preload:path.join(__dirname,'preload.cjs')}});
  window.webContents.on('console-message',(_event,details)=>{if(details.level==='error')console.error(details.message);});
  await window.loadFile(path.join(__dirname,'../dist/renderer/worlds-overlay.html'));
  window.showInactive();
  await new Promise(resolve=>setTimeout(resolve,200));
  for(const position of ['bottom-left','bottom-right','top-left','top-right']){
   await window.webContents.executeJavaScript(`document.querySelector('[data-overlay-position="${position}"]').click();void 0;`);
   await new Promise(resolve=>setTimeout(resolve,30));
   assert.equal(preferences.position,position);assert.equal(preferences.offsetX,null);assert.equal(preferences.offsetY,null);
  }
  await window.webContents.executeJavaScript(`document.querySelector('[data-copy]').click();void 0;`);
  await new Promise(resolve=>setTimeout(resolve,100));assert.equal(copied.at(-1),'ABC123');
  window.webContents.send('example:expanded',true);
  await new Promise(resolve=>setTimeout(resolve,30));
  await window.webContents.executeJavaScript(`document.querySelector('[data-page="appearance"]').click();void 0;`);
  await window.webContents.executeJavaScript(`document.querySelector('.hud-position-options').scrollIntoView({block:'center'});void 0;`);
  await new Promise(resolve=>setTimeout(resolve,50));
  require('node:fs').writeFileSync(path.join(__dirname,'../build/overlay-position-qa.png'),(await window.webContents.capturePage()).toPNG());
  console.log('PASS actual downloaded-overlay renderer: four position presets persist; clipboard IPC delivers the code. OS clipboard '+(bridgeOnly?'excluded explicitly':'verified'));
 }finally{if(window)window.destroy();if(!bridgeOnly)clipboard.write(savedClipboard);}
 app.exit(0);
}).catch(error=>{console.error(error);app.exit(1)});
