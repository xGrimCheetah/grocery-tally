// Replace this with your existing v1.13.0 app logic.
// This tiny snippet just proves localStorage works within the PWA shell.
const out = document.getElementById('out');
document.getElementById('test-btn').addEventListener('click', () => {
  const count = parseInt(localStorage.getItem('pwa-test') || '0', 10) + 1;
  localStorage.setItem('pwa-test', String(count));
  out.textContent = `localStorage counter: ${count}`;
});
console.log('Grocery Tally PWA shell loaded.');
