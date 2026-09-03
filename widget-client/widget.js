
(function ()
{
const cl_token = document.currentScript.dataset.token;
const apiUrl = 'https://mdudebck.vercel.app/'

if(!cl_token) return;


const md = document.createElement('script');
md.src='https://incandescent-meringue-2d5453.netlify.app/md.js';
md.onload = () =>
{

  //Loading state

const skeleton = document.createElement('div');
skeleton.setAttribute('class','cw-spinner-wrap');
skeleton.innerHTML=`
<div class='cw-spinner'>
</div>
`
  document.body.appendChild(skeleton);


const stylesk = document.createElement('style');
stylesk.textContent = `/* skeleton trigger */
.cw-spinner-wrap {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #e4e4dbe1;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
.cw-spinner {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2.5px solid #44403c;
  border-top-color:transparent;
  animation: cw-spin 0.7s linear infinite;
}
@keyframes cw-spin {
  to { transform: rotate(360deg); }
}

`; 

document.head.appendChild(stylesk);



$.ajax({
url:`${apiUrl}constructtmp`,
 headers: { 'Content-Type': 'application/json' },
method:'POST',
data:JSON.stringify({clToken:cl_token}),
success: function (response){
  boot(response.data)
 setTimeout(() => {
  skeleton.remove();
  stylesk.remove();
 }, 200);

},
error:(xhr, ajaxOptions, thrownError) => {

  skeleton.remove();
  stylesk.remove();


  const ErrorSk = document.createElement('div');
  ErrorSk.setAttribute('class','cw-spinner-wrap');
ErrorSk.innerHTML=`
<div class='cw-spinner'>

Error Encountred
</div>
`


  document.body.appendChild(ErrorSk);

const clError = document.createElement('button');
clError.innerHTML='X';
clError.style.background='white';
clError.style.color='red';
clError.style.margin='5px';
clError.style.textAlign='center';
clError.style.padding='2px';
clError.style.height='20px';
clError.style.width='20px';
clError.style.borderRadius='30px';
clError.style.cursor='pointer';
ErrorSk.appendChild(clError);

clError.onclick = () =>
{
  styleError.remove();
  ErrorSk.remove();
}

const styleError = document.createElement('style');
styleError.textContent = `/* skeleton trigger */
.cw-spinner-wrap {
font-family:sans-serif;
position: fixed;
  bottom: 24px;
  right: 24px;
  width: content-fit;
  height: 12px;
  padding:10px;
  border-radius: 10%;
  background: #f94b82e1;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  color: #ffe8efe1;
  font-weight:semibold;
}

`; 
document.head.appendChild(styleError);
}
});


}
document.head.appendChild(md);

 
function boot(template){

    const chhost = document.createElement('div');
    chhost.id='chat-host';

    document.body.appendChild(chhost);

    const shadowChat = document.getElementById('chat-host').attachShadow({mode:'closed'});


//load custom css
const botStyle = document.createElement('style');
botStyle.textContent = template.templateStyle;
shadowChat.appendChild(botStyle);
const chatWin = document.createElement('div');
chatWin.id='cw-modal';
chatWin.setAttribute('class','cw-modal');
shadowChat.appendChild(chatWin);
const chatHead = document.createElement('div');
chatHead.setAttribute('class','cw-header');
chatHead.innerHTML=`<span>${template.botname}</span>`;
chatWin.appendChild(chatHead);

const closeBtn = document.createElement('button');
closeBtn.setAttribute('class','cw-close');
closeBtn.innerHTML=`×`;
closeBtn.onclick = () =>
{
    chatWin.classList.remove('cw-open');
}
chatHead.appendChild(closeBtn)

const chatMsgs = document.createElement('div');
chatMsgs.setAttribute('class','cw-messages');

chatMsgs.innerHTML=`
    <div class="cw-bubble-wrap bot">
  <span class="cw-bubble-label">${template.botname}</span>
  <div class="cw-bubble bot">How can i help you today?</div>
</div>

`;
chatWin.appendChild(chatMsgs);


const chatFoot = document.createElement('div');
chatFoot.setAttribute('class','cw-footer');
chatWin.appendChild(chatFoot);

const chatInpRow = document.createElement('div');
chatInpRow.setAttribute('class','cw-input-row');
chatFoot.appendChild(chatInpRow);

const textMsgBox = document.createElement('textarea');
textMsgBox.setAttribute('class','cw-input');
textMsgBox.rows =2;
textMsgBox.placeholder='Type your message';
chatInpRow.appendChild(textMsgBox);

const sendBtn = document.createElement('button');
sendBtn.setAttribute('class','cw-send');
sendBtn.innerHTML=`<svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
        </svg>`;

        chatInpRow.appendChild(sendBtn);


sendBtn.onclick =  () =>
{


function sendMsg(umsg,usess)
{


const userChatbubble= document.createElement('div');
userChatbubble.setAttribute('class','cw-bubble-wrap user');

userChatbubble.innerHTML = `
 <span class="cw-bubble-label">You</span>
  <div class="cw-bubble user">${umsg}</div>
`;
chatMsgs.appendChild(userChatbubble);


//Loading Stage
  sendBtn.classList.add('loading');

const botMsg = document.createElement('div');
botMsg.setAttribute('class','cw-bubble-wrap bot');
botMsg.innerHTML=`
 <div class="cw-typing">
  <span></span><span></span><span></span>
</div>
`
chatMsgs.appendChild(botMsg);




$.ajax({
  url:`${apiUrl}callagent`,
method:'POST',
 headers: { 'Content-Type': 'application/json' },
data:JSON.stringify({umsg:umsg,uidentity:usess,clToken:cl_token}),
success: function (response){
    
const md = window.markdownit();

botMsg.innerHTML=`
  <span class="cw-bubble-label">${response.botname}</span>
  <div class="cw-bubble bot">${md.render(response.message)}</div>
`;

sendBtn.classList.remove('loading');

textMsgBox.value='';

},
error:() => {



}
});

}

const pendingM = textMsgBox.value.trim();
const u_sess = localStorage.getItem('u_num') || null;
if(!u_sess)
{

const defMsg = document.createElement('div');
defMsg.setAttribute('class','cw-bubble-wrap bot');
defMsg.innerHTML=`
 <span class="cw-bubble-label">${template.botname}</span>
`
chatMsgs.appendChild(defMsg);



const deftext = document.createElement('span');
deftext.setAttribute('class','cw-bubble bot');
deftext.innerText = 'Please Provide your contact information to start conversation';
defMsg.appendChild(deftext);



const grpdInp = document.createElement('div');
grpdInp.style.margin='3px';
grpdInp.setAttribute('class','cw-input-group');
deftext.appendChild(grpdInp);

const inpMobnum = document.createElement('input');
inpMobnum.type='tel';
inpMobnum.placeholder='Type your contact no.';
inpMobnum.setAttribute("class",'cw-input');
grpdInp.appendChild(inpMobnum);
  
const btnJoin = document.createElement('button');
btnJoin.setAttribute('class','cw-ok');
btnJoin.innerText='Join';
grpdInp.appendChild(btnJoin);

btnJoin.onclick = () =>
{

  localStorage.setItem('u_num',inpMobnum.value.trim());
sendMsg(pendingM,inpMobnum.value.trim());
  

}


}
else{

  sendMsg(textMsgBox.value.trim(),u_sess);

}
}

 



//const msgBox = document.createElement('textarea');
//chatWin.id='msgBox'
//chatWin.appendChild(msgBox);

//const sendMsgBtn = document.createElement("button");
//sendMsgBtn.innerHTML= 'send';
//sendMsgBtn.onclick = () =>
//{
//sendMsg(msgBox.value);/
//}
//chatWin.appendChild(sendMsgBtn)



//load Modal open button

const openBtn = document.createElement('button');
openBtn.setAttribute("class",'cw-trigger')
openBtn.addEventListener('click',()=>
{
chatWin.classList.toggle('cw-open');
});

openBtn.innerHTML=`
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3C6.5 3 2 6.9 2 11.7c0 2.7 1.4 5.1 3.6 6.7-.1.8-.5 2.1-1.5 3.1 0 0 2.4-.3 4.3-1.6 1.1.3 2.3.5 3.6.5 5.5 0 10-3.9 10-8.7S17.5 3 12 3z"/>
  </svg>
`
shadowChat.appendChild(openBtn);









}




//boot();

})

()