/**
 * URL State Management
 * Handles encoding/decoding selected songs in the URL hash
 */

const URLState = {
  /**
   * Encode selected song IDs into URL hash
   * @param {Array<number>} songIds - Array of selected song IDs
   */
  encodeState(songIds) {
    if (
      !songIds ||
      songIds.length === 0
    ) {
      history.replaceState(
        null,
        "",
        window.location.pathname
      );
      return;
    }

    const idsString = songIds.join(",");
    const encoded = btoa(idsString);
    history.replaceState(
      null,
      "",
      `#s=${encoded}`
    );
  },

  /**
   * Decode selected song IDs from URL hash
   * @returns {Array<number>} Array of song IDs
   */
  decodeState() {
    const hash = window.location.hash;

    if (!hash || hash.length < 3) {
      return [];
    }

    try {
      const encoded = hash.substring(3);
      const decoded = atob(encoded);
      const ids = decoded
        .split(",")
        .map((id) => parseInt(id, 10));

      return ids.filter(
        (id) => !isNaN(id) && id > 0
      );
    } catch (error) {
      console.error(
        "Error decoding URL state:",
        error
      );
      return [];
    }
  },

  /**
   * Generate shareable URL with current selection
   * @param {Array<number>} songIds - Array of selected song IDs
   * @returns {string} Full shareable URL
   */
  generateShareableURL(songIds) {
    if (
      !songIds ||
      songIds.length === 0
    ) {
      return (
        window.location.origin +
        window.location.pathname
      );
    }

    const idsString = songIds.join(",");
    const encoded = btoa(idsString);
    return `${window.location.origin}${window.location.pathname}#s=${encoded}`;
  },
};
