document.addEventListener('click',function(e){var m=document.querySelector('.mm[open]');if(m&&!m.contains(e.target))m.removeAttribute('open')});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){var m=document.querySelector('.mm[open]');if(m){m.removeAttribute('open');m.querySelector('summary').focus()}}});
