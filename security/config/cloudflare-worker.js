// Cloudflare Worker for BASH-Site (optional edge protection)
// Rate limiting / bot management can be added here.
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  return fetch(request)
}
