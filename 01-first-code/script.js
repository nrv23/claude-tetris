const valueEl = document.querySelector('#value');
const incrementBtn = document.querySelector('#increment');
const decrementBtn = document.querySelector('#decrement');
const resetBtn = document.querySelector('#reset');

let count = 0;

const render = () => {
  valueEl.textContent = count;
};

incrementBtn.addEventListener('click', () => {
  count++;
  render();
});

decrementBtn.addEventListener('click', () => {
  count--;
  render();
});

resetBtn.addEventListener('click', () => {
  count = 0;
  render();
});

render();


// comentario de prueba