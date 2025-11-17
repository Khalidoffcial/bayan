var toggle = document.getElementById("icon");
var body = document.querySelector("body");
toggle.onclick = () => {
    document.body.classList.toggle("Dark-theme");
}
document.getElementById("year").textContent = new Date().getFullYear();