/**
 * Karaoke Picker Application
 * Main logic for song selection and UI management
 */

class KaraokePicker {
  constructor() {
    // Convert country codes
    this.songs = this.processSongs(
      KARAOKE_SONGS
    );
    this.selectedSongs = [];
    this.availableSongs = [
      ...this.songs,
    ];
    this.currentFilter = "all";
    this.searchQuery = "";

    this.initializeElements();
    this.attachEventListeners();
    this.loadStateFromURL();
    this.render();
  }

  /**
   * Process songs: convert country codes and sort
   */
  processSongs(songs) {
    return songs
      .map((song) => ({
        ...song,
        country:
          song.country === "BRA"
            ? "Nacional"
            : "Internacional",
      }))
      .sort((a, b) => {
        // Sort by country first (Nacional before Internacional)
        if (
          a.country === "Nacional" &&
          b.country !== "Nacional"
        )
          return -1;
        if (
          a.country !== "Nacional" &&
          b.country === "Nacional"
        )
          return 1;

        // Then sort alphabetically by artist
        return a.artist.localeCompare(
          b.artist,
          "pt-BR"
        );
      });
  }

  /**
   * Initialize DOM element references
   */
  initializeElements() {
    this.searchInput =
      document.getElementById(
        "searchInput"
      );
    this.selectedList =
      document.getElementById(
        "selectedList"
      );
    this.availableList =
      document.getElementById(
        "availableList"
      );
    this.selectedCount =
      document.getElementById(
        "selectedCount"
      );
    this.availableCount =
      document.getElementById(
        "availableCount"
      );
    this.copyLinkBtn =
      document.getElementById(
        "copyLinkBtn"
      );
    this.clearAllBtn =
      document.getElementById(
        "clearAllBtn"
      );
    this.filterButtons =
      document.querySelectorAll(
        ".filter-btn"
      );
    this.toast =
      document.getElementById("toast");
    this.alphabetLetters =
      document.getElementById(
        "alphabetLetters"
      );
    this.availableSection =
      document.getElementById(
        "availableSection"
      );
    this.fullscreenBtn =
      document.getElementById(
        "fullscreenBtn"
      );
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Search input
    this.searchInput.addEventListener(
      "input",
      (e) => {
        this.searchQuery =
          e.target.value.toLowerCase();
        this.renderAvailableList();
      }
    );

    // Filter buttons
    this.filterButtons.forEach(
      (btn) => {
        btn.addEventListener(
          "click",
          (e) => {
            this.filterButtons.forEach(
              (b) =>
                b.classList.remove(
                  "active"
                )
            );
            e.target.classList.add(
              "active"
            );
            this.currentFilter =
              e.target.dataset.filter;
            this.renderAvailableList();
          }
        );
      }
    );

    // Copy link button
    this.copyLinkBtn.addEventListener(
      "click",
      () => this.copyShareableLink()
    );

    // Clear all button
    this.clearAllBtn.addEventListener(
      "click",
      () => this.clearAllSelections()
    );

    // Fullscreen toggle button
    this.fullscreenBtn.addEventListener(
      "click",
      () => this.toggleFullscreen()
    );

    // ESC key to exit fullscreen
    document.addEventListener(
      "keydown",
      (e) => {
        if (
          e.key === "Escape" &&
          this.isFullscreen
        ) {
          this.toggleFullscreen();
        }
      }
    );

    // Handle browser back/forward buttons
    window.addEventListener(
      "popstate",
      () => {
        this.loadStateFromURL();
        this.render();
      }
    );
  }

  /**
   * Load selected songs from URL hash
   */
  loadStateFromURL() {
    const selectedIds =
      URLState.decodeState();

    if (selectedIds.length === 0) {
      return;
    }

    // Find songs by ID
    const selectedSongsFromURL = [];
    selectedIds.forEach((id) => {
      const song = this.songs.find(
        (s) => s.id === id
      );
      if (song) {
        selectedSongsFromURL.push(song);
      }
    });

    this.selectedSongs =
      selectedSongsFromURL;
    this.updateAvailableSongs();
  }

  /**
   * Update available songs list (remove selected ones)
   */
  updateAvailableSongs() {
    const selectedIds = new Set(
      this.selectedSongs.map(
        (s) => s.id
      )
    );
    this.availableSongs =
      this.songs.filter(
        (song) =>
          !selectedIds.has(song.id)
      );
  }

  /**
   * Select a song (move from available to selected)
   */
  selectSong(songId) {
    const song =
      this.availableSongs.find(
        (s) => s.id === songId
      );
    if (!song) return;

    this.selectedSongs.push(song);
    this.updateAvailableSongs();
    this.updateURLState();
    this.render();
    this.showToast(
      `✅ "${song.title}" adicionada!`,
      "success"
    );
  }

  /**
   * Deselect a song (move from selected to available)
   */
  deselectSong(songId) {
    const song =
      this.selectedSongs.find(
        (s) => s.id === songId
      );
    if (!song) return;

    this.selectedSongs =
      this.selectedSongs.filter(
        (s) => s.id !== songId
      );
    this.updateAvailableSongs();
    this.updateURLState();
    this.render();
    this.showToast(
      `❌ "${song.title}" removida!`,
      "error"
    );
  }

  /**
   * Clear all selections
   */
  clearAllSelections() {
    if (this.selectedSongs.length === 0)
      return;

    if (
      confirm(
        "Deseja realmente remover todas as músicas selecionadas?"
      )
    ) {
      this.selectedSongs = [];
      this.updateAvailableSongs();
      this.updateURLState();
      this.render();
      this.showToast(
        "🗑️ Todas as músicas foram removidas!",
        "error"
      );
    }
  }

  /**
   * Copy shareable link to clipboard
   */
  async copyShareableLink() {
    const selectedIds =
      this.selectedSongs.map(
        (s) => s.id
      );
    const url =
      URLState.generateShareableURL(
        selectedIds
      );

    try {
      await navigator.clipboard.writeText(
        url
      );
      this.showToast(
        "📋 Link copiado! Compartilhe com seus amigos!",
        "success"
      );
    } catch (error) {
      // Fallback for older browsers
      const textarea =
        document.createElement(
          "textarea"
        );
      textarea.value = url;
      document.body.appendChild(
        textarea
      );
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(
        textarea
      );
      this.showToast(
        "📋 Link copiado!",
        "success"
      );
    }
  }

  /**
   * Update URL hash with current selection
   */
  updateURLState() {
    const selectedIds =
      this.selectedSongs.map(
        (s) => s.id
      );
    URLState.encodeState(selectedIds);
  }

  /**
   * Toggle fullscreen mode for catalog
   */
  toggleFullscreen() {
    this.isFullscreen =
      !this.isFullscreen;

    if (this.isFullscreen) {
      this.availableSection.classList.add(
        "fullscreen"
      );
      document.body.classList.add(
        "catalog-fullscreen"
      );
      this.fullscreenBtn.innerHTML =
        "⊗ Minimizar";
      this.fullscreenBtn.title =
        "Minimizar catálogo";
    } else {
      this.availableSection.classList.remove(
        "fullscreen"
      );
      document.body.classList.remove(
        "catalog-fullscreen"
      );
      this.fullscreenBtn.innerHTML =
        "⛶ Expandir";
      this.fullscreenBtn.title =
        "Expandir catálogo";
    }
  }

  /**
   * Filter and search available songs
   */
  getFilteredSongs() {
    let filtered = this.availableSongs;

    // Apply country filter
    if (this.currentFilter !== "all") {
      filtered = filtered.filter(
        (song) =>
          song.country ===
          this.currentFilter
      );
    }

    // Apply search query
    if (this.searchQuery) {
      filtered = filtered.filter(
        (song) => {
          const title =
            song.title.toLowerCase();
          const artist =
            song.artist.toLowerCase();
          const code =
            song.code.toLowerCase();
          return (
            title.includes(
              this.searchQuery
            ) ||
            artist.includes(
              this.searchQuery
            ) ||
            code.includes(
              this.searchQuery
            )
          );
        }
      );
    }

    return filtered;
  }

  /**
   * Create HTML for a song item
   */
  createSongHTML(
    song,
    isSelected = false
  ) {
    const countryClass =
      song.country === "Nacional"
        ? "country-nacional"
        : "country-internacional";
    const clickHandler = isSelected
      ? "deselectSong"
      : "selectSong";
    const escapedCountry =
      this.escapeHtml(song.country);

    // Abbreviate country name for selected songs
    const countryLabel = isSelected
      ? song.country === "Nacional"
        ? "N"
        : "I"
      : song.country;

    return `
      <div class="song-item" onclick="app.${clickHandler}(${
      song.id
    })">
        <div class="song-info">
          <div class="song-title">${this.escapeHtml(
            song.title
          )}</div>
          <div class="song-meta">
            <span class="song-artist">🎵 ${this.escapeHtml(
              song.artist
            )}</span>
            <span class="song-code">#${
              song.code
            }</span>
            <span class="song-country ${countryClass}" title="${escapedCountry}">${countryLabel}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div =
      document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Render selected songs list
   */
  renderSelectedList() {
    this.selectedCount.textContent =
      this.selectedSongs.length;

    if (
      this.selectedSongs.length === 0
    ) {
      this.selectedList.classList.add(
        "empty-state"
      );
      this.selectedList.innerHTML = `
        <div class="empty-state">
          <p class="empty-message">Nenhuma música selecionada ainda. Clique em uma música abaixo para adicionar!</p>
        </div>
      `;
      return;
    }

    this.selectedList.classList.remove(
      "empty-state"
    );

    // Sort selected songs the same way as available songs
    const sortedSelected = [
      ...this.selectedSongs,
    ].sort((a, b) => {
      // Sort by country first (Nacional before Internacional)
      if (
        a.country === "Nacional" &&
        b.country !== "Nacional"
      )
        return -1;
      if (
        a.country !== "Nacional" &&
        b.country === "Nacional"
      )
        return 1;

      // Then sort alphabetically by artist
      return a.artist.localeCompare(
        b.artist,
        "pt-BR"
      );
    });

    const html = sortedSelected
      .map((song) =>
        this.createSongHTML(song, true)
      )
      .join("");

    this.selectedList.innerHTML = html;
  }

  /**
   * Render available songs list
   */
  renderAvailableList() {
    const filtered =
      this.getFilteredSongs();
    this.availableCount.textContent =
      filtered.length;

    if (filtered.length === 0) {
      this.availableList.innerHTML = `
        <div class="empty-state">
          <p class="empty-message">
            ${
              this.searchQuery
                ? "🔍 Nenhuma música encontrada com essa busca."
                : "📭 Nenhuma música disponível."
            }
          </p>
        </div>
      `;
      return;
    }

    const htmlParts = [];
    let lastArtist = null;

    filtered.forEach((song) => {
      if (song.artist !== lastArtist) {
        lastArtist = song.artist;
        htmlParts.push(
          `<div class="artist-header">${this.escapeHtml(
            song.artist
          )}</div>`
        );
      }

      htmlParts.push(
        this.createSongHTML(song, false)
      );
    });

    this.availableList.innerHTML =
      htmlParts.join("");
    this.buildAlphabetNav(filtered);
  }

  /**
   * Build alphabet navigation based on available artists
   */
  buildAlphabetNav(songs) {
    const alphabet = [
      "#",
      ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(
        ""
      ),
    ];
    const availableLetters = new Set();

    // Find which letters have artists
    songs.forEach((song) => {
      const firstChar = song.artist
        .charAt(0)
        .toUpperCase();
      if (/[0-9]/.test(firstChar)) {
        availableLetters.add("#");
      } else if (
        alphabet.includes(firstChar)
      ) {
        availableLetters.add(firstChar);
      }
    });

    // Build alphabet buttons
    const html = alphabet
      .map((letter) => {
        const disabled =
          !availableLetters.has(letter)
            ? "disabled"
            : "";
        return `<div class="alphabet-letter ${disabled}" data-letter="${letter}">${letter}</div>`;
      })
      .join("");

    this.alphabetLetters.innerHTML =
      html;

    // Add click handlers
    this.alphabetLetters
      .querySelectorAll(
        ".alphabet-letter:not(.disabled)"
      )
      .forEach((btn) => {
        btn.addEventListener(
          "click",
          (e) => {
            const letter =
              e.target.dataset.letter;
            this.handleLetterClick(
              letter,
              songs
            );
          }
        );
      });

    // Setup scroll listener to highlight current letter
    this.availableList.addEventListener(
      "scroll",
      () => {
        this.updateCurrentLetter(songs);
      }
    );

    // Initial highlight
    setTimeout(
      () =>
        this.updateCurrentLetter(songs),
      100
    );
  }

  /**
   * Handle letter click with toggle between Nacional/Internacional
   */
  handleLetterClick(letter, songs) {
    const lastLetter =
      this.lastClickedLetter;
    const lastCountry =
      this.lastClickedCountry ||
      "Nacional";

    if (letter === lastLetter) {
      // Same letter clicked twice - toggle country
      const nextCountry =
        lastCountry === "Nacional"
          ? "Internacional"
          : "Nacional";
      this.scrollToLetter(
        letter,
        songs,
        nextCountry
      );
      this.lastClickedCountry =
        nextCountry;
    } else {
      // Different letter - keep the same country preference
      this.scrollToLetter(
        letter,
        songs,
        lastCountry
      );
    }

    this.lastClickedLetter = letter;
  }

  /**
   * Update current letter highlight based on scroll position
   */
  updateCurrentLetter(songs) {
    if (!songs || songs.length === 0)
      return;

    const scrollTop =
      this.availableList.scrollTop;
    const songElements =
      this.availableList.querySelectorAll(
        ".song-item"
      );

    // Find the first visible song
    let currentSong = null;
    for (let element of songElements) {
      const elementTop =
        element.offsetTop -
        this.availableList.offsetTop;
      if (
        elementTop >=
        scrollTop - 50
      ) {
        const artistText = element
          .querySelector(".song-artist")
          .textContent.replace(
            "🎵 ",
            ""
          );
        currentSong = songs.find(
          (s) => s.artist === artistText
        );
        break;
      }
    }

    if (currentSong) {
      const firstChar =
        currentSong.artist
          .charAt(0)
          .toUpperCase();
      const letter = /[0-9]/.test(
        firstChar
      )
        ? "#"
        : firstChar;

      // Remove all active classes
      this.alphabetLetters
        .querySelectorAll(
          ".alphabet-letter"
        )
        .forEach((btn) => {
          btn.classList.remove(
            "active-nacional",
            "active-internacional",
            "active-scroll"
          );
        });

      // Add appropriate class based on country
      const btn =
        this.alphabetLetters.querySelector(
          `[data-letter="${letter}"]`
        );
      if (btn) {
        btn.classList.add(
          "active-scroll"
        );
        if (
          currentSong.country ===
          "Nacional"
        ) {
          btn.classList.add(
            "active-nacional"
          );
        } else {
          btn.classList.add(
            "active-internacional"
          );
        }
      }
    }
  }

  /**
   * Scroll to first artist starting with letter
   */
  scrollToLetter(
    letter,
    songs,
    preferredCountry = "Nacional"
  ) {
    // Find song with specified letter and country
    let targetSong = null;

    if (letter === "#") {
      // Numbers
      targetSong = songs.find(
        (song) =>
          /[0-9]/.test(
            song.artist.charAt(0)
          ) &&
          song.country ===
            preferredCountry
      );
      // If not found in preferred country, try the other
      if (!targetSong) {
        targetSong = songs.find(
          (song) =>
            /[0-9]/.test(
              song.artist.charAt(0)
            )
        );
      }
    } else {
      targetSong = songs.find(
        (song) =>
          song.artist
            .charAt(0)
            .toUpperCase() === letter &&
          song.country ===
            preferredCountry
      );
      // If not found in preferred country, try the other
      if (!targetSong) {
        targetSong = songs.find(
          (song) =>
            song.artist
              .charAt(0)
              .toUpperCase() === letter
        );
      }
    }

    if (!targetSong) return;

    // Find the song element in the DOM
    const songElements =
      this.availableList.querySelectorAll(
        ".song-item"
      );
    for (
      let i = 0;
      i < songElements.length;
      i++
    ) {
      const element = songElements[i];
      const artistText = element
        .querySelector(".song-artist")
        .textContent.replace("🎵 ", "");
      if (
        artistText === targetSong.artist
      ) {
        // Scroll the list to this element
        const elementTop =
          element.offsetTop -
          this.availableList.offsetTop;
        this.availableList.scrollTo({
          top: elementTop - 20,
          behavior: "smooth",
        });

        // Update button highlighting
        this.alphabetLetters
          .querySelectorAll(
            ".alphabet-letter"
          )
          .forEach((btn) => {
            btn.classList.remove(
              "active-nacional",
              "active-internacional",
              "active-scroll"
            );
          });

        const letterBtn =
          this.alphabetLetters.querySelector(
            `[data-letter="${letter}"]`
          );
        letterBtn.classList.add(
          "active-scroll"
        );
        if (
          targetSong.country ===
          "Nacional"
        ) {
          letterBtn.classList.add(
            "active-nacional"
          );
          this.lastClickedCountry =
            "Nacional";
        } else {
          letterBtn.classList.add(
            "active-internacional"
          );
          this.lastClickedCountry =
            "Internacional";
        }

        break;
      }
    }
  }

  /**
   * Render both lists
   */
  render() {
    this.renderSelectedList();
    this.renderAvailableList();
  }

  /**
   * Show toast notification
   */
  showToast(message, type = "success") {
    this.toast.textContent = message;
    this.toast.className = `toast ${type} show`;

    setTimeout(() => {
      this.toast.classList.remove(
        "show"
      );
    }, 3000);
  }
}

// Initialize app when DOM is ready
let app;
if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      app = new KaraokePicker();
    }
  );
} else {
  app = new KaraokePicker();
}
