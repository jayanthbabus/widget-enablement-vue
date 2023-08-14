// plugins/webfontloader.js

import WebFontLoader from 'webfontloader';

export async function loadFonts() {
  try {
    await new Promise((resolve, reject) => {
      WebFontLoader.load({
        google: {
          families: ['Roboto:100,300,400,500,700,900&display=swap'],
        },
        active: resolve,
        inactive: reject,
      });
    });
  } catch (error) {
    console.error('Error loading fonts:', error);
  }
}
