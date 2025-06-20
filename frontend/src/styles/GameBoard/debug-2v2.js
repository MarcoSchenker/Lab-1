/* GameBoard 2v2 Debug Helper */

/* 
 * To enable debug mode for 2v2 layout, add this class to the body element:
 * document.body.classList.add('debug-2v2');
 * 
 * To disable debug mode:
 * document.body.classList.remove('debug-2v2');
 * 
 * Or you can run this in the browser console:
 * toggleDebug2v2()
 */

// Global debug toggle function
window.toggleDebug2v2 = function() {
  const hasDebug = document.body.classList.contains('debug-2v2');
  if (hasDebug) {
    document.body.classList.remove('debug-2v2');
    console.log('🔍 2v2 Debug mode: OFF');
  } else {
    document.body.classList.add('debug-2v2');
    console.log('🔍 2v2 Debug mode: ON');
  }
};

// You can also call these directly:
window.enableDebug2v2 = function() {
  document.body.classList.add('debug-2v2');
  console.log('🔍 2v2 Debug mode: ON');
};

window.disableDebug2v2 = function() {
  document.body.classList.remove('debug-2v2');
  console.log('🔍 2v2 Debug mode: OFF');
};
