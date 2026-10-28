
  // This function is intentionally outside the module script so inline image onerror can call it.
  function swapLogoOrFallback(img) {
    if (img.dataset.triedJpg !== 'true') {
      img.dataset.triedJpg = 'true';
      img.src = 'logo.jpg';
      return;
    }
    img.style.display = 'none';
    const fallback = img.nextElementSibling;
    if (fallback) fallback.style.display = 'block';
  }
