const {app,BrowserWindow,ipcMain}=require('electron'),assert=require('node:assert/strict'),path=require('node:path');
app.on('window-all-closed',()=>{});const root=path.join(__dirname,'..');app.setPath('userData',path.join(root,'build','responsive-profile'));
const snapshot={state:'idle',username:'Player',code:'',address:'',version:'26.3',message:'',members:[],participants:[],invites:[],inviteError:'',isPublic:false,roomTitle:''};
ipcMain.handle('example:snapshot',()=>snapshot);ipcMain.handle('example:preferences',()=>({opacity:90,position:'top-right',showVoice:true,showPresence:true,animations:false,width:300,height:0,minimal:false}));ipcMain.handle('example:expand',()=>{});
(async()=>{await app.whenReady();for(const [width,height] of [[340,254],[300,220],[260,180],[406,400]]){
 const w=new BrowserWindow({show:false,width,height,frame:false,webPreferences:{offscreen:true,backgroundThrottling:false,preload:path.join(root,'examples/preload.cjs'),sandbox:true,contextIsolation:true}});
 await w.loadFile(path.join(root,'dist/renderer/worlds-overlay.html'));await new Promise(r=>setTimeout(r,150));w.webContents.send('example:expanded',false);w.webContents.send('example:lan',true);await new Promise(r=>setTimeout(r,150));
 const m=await w.webContents.executeJavaScript(`(()=>{const s=document.querySelector('.hud-shell'),b=document.querySelector('.hud-lan-prompt button'),r=b.getBoundingClientRect();return {width:innerWidth,height:innerHeight,shellWidth:s.clientWidth,scrollWidth:s.scrollWidth,shellHeight:s.clientHeight,scrollHeight:s.scrollHeight,buttonBottom:r.bottom,thumb:getComputedStyle(s,'::-webkit-scrollbar').width,scrollbarColor:getComputedStyle(s).scrollbarColor,bodyScroll:document.body.scrollHeight}})()`);
 assert.equal(m.thumb,'5px');assert.equal(m.scrollbarColor,'auto');assert.ok(m.scrollWidth<=m.shellWidth+1,JSON.stringify(m));assert.ok(m.buttonBottom<=m.height,JSON.stringify(m));assert.ok(m.bodyScroll<=m.height,JSON.stringify(m));console.log('PASS '+JSON.stringify(m));
 if(width===340){const shot=await w.webContents.capturePage();require('fs').writeFileSync(path.join(root,'build','responsive-lan.png'),shot.toPNG());}w.destroy();
 }app.exit(0);})().catch(e=>{console.error(e);app.exit(1)});

