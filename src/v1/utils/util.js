// Utility function to insert a delay in processing
// use await delay(1000) to wait 1 second (1000 milliseconds)

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

module.exports = { delay };
