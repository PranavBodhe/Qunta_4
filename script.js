let formbox2 = document.querySelector('.form-box2')
let formbox = document.querySelector('.form-box')

function reg() {
    formbox2.classList.add("open-form-box2");
    formbox.classList.add("open-form-box");
}

function log() {
    formbox2.classList.remove("open-form-box2");
    formbox.classList.remove("open-form-box");

}

function myfx() {
    var x = document.getElementById("myip");
    if (x.type == 'password') {
        x.type = 'text';
        document.getElementById('hide1').style.display = "inline-block";
        document.getElementById('show1').style.display = "none";
    }
    else {
        x.type = "password";
        document.getElementById('show1').style.display = "inline-block";
        document.getElementById('hide1').style.display = "none";
    }
}
function myfx2() {
    var y = document.getElementById("myip2");
    if (y.type == 'password') {
        y.type = 'text';
        document.getElementById('hide2').style.display = "inline-block";
        document.getElementById('show2').style.display = "none";
    }
    else {
        y.type = "password";
        document.getElementById('show2').style.display = "inline-block";
        document.getElementById('hide2').style.display = "none";
    }
}

const scriptURL = 'https://script.google.com/macros/s/AKfycbxmMpJGBcGtYIwj7vXMATzcjxPeR_vEQxNxXUIAoE5Dwz9AKDuk9s-NjfiQV3RIR77QKw/exec'
const form = document.forms['google-sheet']

form.addEventListener('submit', e => {
    e.preventDefault()
    fetch(scriptURL, { method: 'POST', body: new FormData(form) })
        .then(response => console.log('Success!', response))
        .catch(error => console.error('Error!', error.message))
})

const ps = document.getElementById("myip");
const cnps = document.getElementById("myip2");
const bt = document.querySelector(".btn2")

function look(ele) {
    if (ele.value !== ps.value) {
        bt.disabled=true;
        document.getElementById('tell').innerText = 'confirm password dont match';
        tell.style.color = 'red';
        cnps.style.borderColor='red';
    } else {
        bt.disabled=false;
        document.getElementById('tell').innerText = "confirm password matched";
        tell.style.color = 'green'; 
        cnps.style.borderColor='green';
    }
}