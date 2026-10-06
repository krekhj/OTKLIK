// Макеты страницы входа hh.ru для тестов: те же data-qa, что на живом сайте,
// и поведение, на котором бот уже ломался (капча, перерисовка клеток кода,
// висящая ошибка прошлой попытки, автоотправка после последней цифры).
import type { BrowserContext } from "playwright";

const HOME = `<!doctype html><meta charset=utf-8><body><a href="#">резюме</a></body>`;

const form = (body: string, script: string) => `<!doctype html><meta charset=utf-8><body>
<form onsubmit="return false">
 <button data-qa="submit-button" id="sub">Дальше</button>
 <label style="display:none" id="rl"><input type=radio data-qa="credential-type-email">Почта</label>
 <input style="display:none" data-qa="applicant-login-input-email" id="em">
 ${body}
 <div id="err"></div>
</form>
<div id="cap"></div>
<script>
let stage=0;
const show=(...ids)=>ids.forEach(i=>document.getElementById(i).style.display='');
const fail=(text)=>{ err.innerHTML='<span class="magritte-text_style-negative">'+text+'</span>'; };
function captcha(onSolved){
  let n=0;
  const draw=()=>{ const c=document.createElement('canvas'); c.width=200; c.height=60; const x=c.getContext('2d');
    x.fillStyle='#ccc'; x.fillRect(0,0,200,60); x.fillStyle='#222'; x.font='30px serif'; x.fillText('текст '+(++n),20,40); return c.toDataURL(); };
  cap.innerHTML='<div role=dialog><h2>Пройдите капчу</h2><p>введите текст с картинки:</p><img id=ci><button id=cr aria-label="Обновить">↻</button><input placeholder="Текст с картинки"><button id=cs>Отправить</button></div>';
  ci.src=draw(); cr.onclick=()=>{ ci.src=draw(); };
  cs.onclick=()=>{ const v=cap.querySelector('input').value; cap.innerHTML=''; onSolved(v); };
}
${script}
</script>`;

export type PasswordMock = { password: string; captcha?: "none" | "once" | "endless" };

export function passwordPage({ password, captcha = "none" }: PasswordMock) {
  return form(
    `<button style="display:none" data-qa="expand-login-by-password" id="tg">Войти с паролем</button>
     <input style="display:none" data-qa="applicant-login-input-password" id="pw">`,
    `tg.onclick=()=>show('pw');
     let captchas=0;
     const check=()=>{ if(pw.value===${JSON.stringify(password)}) location.href='https://hh.ru/'; else fail('Неверный email или пароль'); };
     sub.onclick=()=>{
       if(stage===0){ stage=1; show('rl','em','tg'); return; }
       const mode=${JSON.stringify(captcha)};
       if(mode==='endless' || (mode==='once' && captchas===0)){ captchas++; captcha((v)=>{ if(mode==='once') check(); else setTimeout(()=>sub.click(),100); }); return; }
       check();
     };`,
  );
}

export type CodeWidget = "rerender" | "keys" | "single-hide" | "stale";

// Код 123456 верный. Виджеты:
// rerender — клетки пересоздаются после каждой цифры, автоотправка;
// keys — клетки принимают цифры только с клавиатуры;
// single-hide — одно поле + кнопка, поле прячется на время проверки;
// stale — клетки, ошибка висит до следующей проверки, ничего не прячется.
export function codePage(widget: CodeWidget) {
  const cells = `
    const box=document.getElementById('box'); let digits=['','','','','',''];
    const value=()=>digits.join('');
    const verdict=(reset)=>setTimeout(()=>{ if(value()==='123456'){ location.href='https://hh.ru/'; return; } if(reset){ digits=['','','','','','']; render(0); } fail('Неверный код. Попробуйте ещё раз'); }, 400);`;
  const scripts: Record<CodeWidget, string> = {
    rerender: `${cells}
      function render(focus){ box.innerHTML=digits.map((d,i)=>'<input maxlength=1 autocomplete="one-time-code" value="'+d+'" data-i="'+i+'">').join('');
        box.querySelectorAll('input').forEach(c=>c.addEventListener('input',()=>{ const i=+c.dataset.i; digits[i]=c.value.slice(-1); err.innerHTML=''; render(Math.min(i+1,5)); if(digits.every(Boolean)) verdict(true); }));
        box.querySelectorAll('input')[focus]?.focus(); }`,
    keys: `${cells}
      function render(focus){ box.innerHTML=digits.map((d,i)=>'<input maxlength=1 autocomplete="one-time-code" value="'+d+'" data-i="'+i+'">').join('');
        box.querySelectorAll('input').forEach(c=>{ const i=+c.dataset.i;
          c.addEventListener('input',()=>{ c.value=digits[i]; });
          c.addEventListener('keydown',e=>{ if(/^[0-9]$/.test(e.key)){ e.preventDefault(); digits[i]=e.key; render(Math.min(i+1,5)); if(digits.every(Boolean)) verdict(true); }
            else if(e.key==='Backspace'){ e.preventDefault(); digits[i]=''; render(Math.max(i-1,0)); } }); });
        box.querySelectorAll('input')[focus]?.focus(); }`,
    "single-hide": `const box=document.getElementById('box');
      function render(){ box.innerHTML='<input autocomplete="one-time-code" maxlength=6 id=one>'; }
      function submitCode(){ box.style.display='none'; setTimeout(()=>{ if(one.value==='123456'){ location.href='https://hh.ru/'; return; } box.style.display=''; fail('Неверный код'); }, 500); }`,
    stale: `${cells}
      function render(){ box.innerHTML=digits.map((d,i)=>'<input maxlength=1 autocomplete="one-time-code" data-i="'+i+'">').join('');
        const all=[...box.querySelectorAll('input')];
        all.forEach(c=>c.addEventListener('input',()=>{ const i=+c.dataset.i; digits[i]=c.value; if(c.value&&all[i+1]) all[i+1].focus(); if(digits.every(Boolean)) verdict(false); })); }`,
  };
  return form(
    `<input name="otp-code" style="display:none"><div id="box" style="display:none"></div>`,
    `${scripts[widget]}
     sub.onclick=()=>{
       if(stage===0){ stage=1; show('rl','em'); }
       else if(stage===1){ stage=2; show('box'); render(0); }
       else if(typeof submitCode==='function') submitCode();
     };`,
  );
}

// Подменяет hh.ru: страница входа — макет, всё остальное — «главная».
export async function mockHh(ctx: BrowserContext, loginHtml: string) {
  await ctx.route("https://hh.ru/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({
      contentType: "text/html",
      body: path.startsWith("/account/login") ? loginHtml : HOME,
    });
  });
}
