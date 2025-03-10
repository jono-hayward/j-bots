async function getImageSize(url) {
  const response = await fetch(url, { method: 'HEAD' });

  if (!response.ok) {
    throw new Error(`Failed to fetch image headers: ${response.statusText}`);
  }

  const contentLength = response.headers.get('content-length');
  
  if (contentLength) {
    return parseInt(contentLength, 10);
  } else {
    throw new Error('Content-Length header not found');
  }
}
  
getImageSize('https://resize.abcradio.net.au/M9kuMT7VvTYf_UQSqXOvjeHl2lI=/1300x1300/center/middle/https%3A%2F%2Fwww.triplejunearthed.com%2Fsites%2Fdefault%2Ffiles%2Fartists%2Fpublic%2F1%2F7%2F9%2F0%2F1%2F1%2Fabd07d4c-8935-4cac-9bfd-470e3471925d.JPG')
  .then(size => console.log(`Image size: ${size} bytes`))
  .catch(console.error);