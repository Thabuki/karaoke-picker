/**
 * Karaoke Picker Application
 * Main logic for song selection and UI management
 */

const STORAGE_KEYS = {
  selectedSongs: "karaokePicker:selectedSongs:v1",
};

class KaraokePicker {
  constructor() {
    this.songs = this.processSongs(
      KARAOKE_SONGS
    );
    this.selectedSongs = [];
    this.availableSongs = [
      ...this.songs,
    ];
    this.currentFilter = "all";
    this.searchQuery = "";
    this.isFullscreen = false;
    this.searchDebounceTimeout = null;
    this.scrollDebounceTimeout = null;
    this.pendingRenderFrame = null;
    this.alphabetSongs = [];
    this.availableScrollHandler = null;
    this.storageAvailable =
      this.checkStorageAvailability();

    this.initializeElements();
    this.attachEventListeners();
    this.updateShareButtonsState();
    const loadedFromURL =
      this.loadStateFromURL();
    if (!loadedFromURL) {
      this.loadStateFromStorage();
    }
    this.render();
  }

  /**
   * Process songs: convert country codes and sort
   */
  processSongs(songs) {
    return songs
      .map(
        ({
          id,
          code,
          title,
          artist,
          country,
        }) => ({
          id,
          code,
          title,
          artist,
          country:
            country === "BRA"
              ? "Nacional"
              : "Internacional",
        })
      )
      .sort((a, b) => {
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
    this.currentArtistBanner =
      document.getElementById(
        "currentArtistBanner"
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
    this.searchInput.addEventListener(
      "input",
      (e) => {
        this.handleSearchInput(
          e.target.value
        );
      }
    );

    this.filterButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.filterButtons.forEach((b) =>
          b.classList.remove("active")
        );
        e.target.classList.add("active");
        this.currentFilter =
          e.target.dataset.filter;
        this.renderAvailableList();
      });
    });

    this.copyLinkBtn.addEventListener(
      "click",
      () => this.copyShareableLink()
    );

    this.clearAllBtn.addEventListener(
      "click",
      () => this.clearAllSelections()
    );

    this.fullscreenBtn.addEventListener(
      "click",
      () => this.toggleFullscreen()
    );

    document.addEventListener(
      "keydown",
      (e) => {
        if (
          e.key === "Escape" &&
          this.isFullscreen
        ) {
          this.toggleFullscreen();
        }

        const activeElement =
          document.activeElement;
        const isTyping =
          activeElement &&
          (activeElement.tagName ===
            "INPUT" ||
            activeElement.tagName ===
              "TEXTAREA" ||
            activeElement.isContentEditable);

        if (
          e.key === "/" &&
          !e.altKey &&
          !e.ctrlKey &&
          !e.metaKey &&
          !isTyping
        ) {
          this.focusSearchInput();
          e.preventDefault();
        }

        if (
          e.key === "k" &&
          (e.metaKey || e.ctrlKey) &&
          !isTyping
        ) {
          this.focusSearchInput();
          e.preventDefault();
        }
      }
    );

    window.addEventListener("popstate", () => {
      const loadedFromURL =
        this.loadStateFromURL();
      if (!loadedFromURL) {
        this.loadStateFromStorage();
      }
      this.render();
    });
  }

  /**
   * Load selected songs from URL hash
   */
  loadStateFromURL() {
    const selectedIds =
      URLState.decodeState();

    if (selectedIds.length === 0) {
      return false;
    }

    const selectedSongsFromURL = selectedIds
      .map((id) =>
        this.songs.find((song) => song.id === id)
      )
      .filter(Boolean);

    this.selectedSongs =
      selectedSongsFromURL;
    this.updateAvailableSongs();
    this.saveSelectedSongsToStorage();
    return true;
  }

  loadStateFromStorage() {
    if (!this.storageAvailable) {
      return false;
    }

    try {
      const raw = localStorage.getItem(
        STORAGE_KEYS.selectedSongs
      );
      if (!raw) {
        return false;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return false;
      }

      const selectedSongsFromStorage = parsed
        .map((id) =>
          this.songs.find((song) => song.id === id)
        )
        .filter(Boolean);

      if (selectedSongsFromStorage.length === 0) {
        return false;
      }

      this.selectedSongs =
        selectedSongsFromStorage;
      this.updateAvailableSongs();
      this.updateURLState();
      return true;
    } catch (error) {
      console.warn(
        "Não foi possível carregar as músicas salvas:",
        error
      );
      return false;
    }
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
      this.fallbackCopy(
        url,
        "📋 Link copiado!"
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
    this.saveSelectedSongsToStorage();
  }

  saveSelectedSongsToStorage() {
    if (!this.storageAvailable) {
      return;
    }

    try {
      const ids = this.selectedSongs.map(
        (song) => song.id
      );
      localStorage.setItem(
        STORAGE_KEYS.selectedSongs,
        JSON.stringify(ids)
      );
    } catch (error) {
      console.warn(
        "Não foi possível salvar as músicas selecionadas:",
        error
      );
    }
  }

  checkStorageAvailability() {
    try {
      const testKey = "__kp_storage_test__";
      localStorage.setItem(testKey, "1");
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn(
        "Armazenamento local indisponível:",
        error
      );
      return false;
    }
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

    if (this.currentFilter !== "all") {
      filtered = filtered.filter(
        (song) =>
          song.country ===
          this.currentFilter
      );
    }

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

    this.updateShareButtonsState();

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

    const sortedSelected =
      this.getSortedSelectedSongs();

    const html = sortedSelected
      .map((song) =>
        this.createSongHTML(song, true)
      )
      .join("");

    this.selectedList.innerHTML = html;
  }

  getSortedSelectedSongs() {
    return [...this.selectedSongs].sort(
      (a, b) => {
        if (
          a.country === "Nacional" &&
          b.country !== "Nacional"
        ) {
          return -1;
        }
        if (
          a.country !== "Nacional" &&
          b.country === "Nacional"
        ) {
          return 1;
        }
        return a.artist.localeCompare(
          b.artist,
          "pt-BR"
        );
      }
    );
  }

  /**
   * Render available songs list
   */
  renderAvailableList(options = {}) {
    const immediate =
      !!options.immediate;
    const preserveScroll =
      !!options.preserveScroll;

    const filtered =
      this.getFilteredSongs();
    this.availableCount.textContent =
      filtered.length;

    this.cancelAvailableRender();

    if (this.scrollDebounceTimeout) {
      clearTimeout(
        this.scrollDebounceTimeout
      );
      this.scrollDebounceTimeout = null;
    }

    if (this.availableScrollHandler) {
      this.availableList.removeEventListener(
        "scroll",
        this.availableScrollHandler
      );
      this.availableScrollHandler =
        null;
    }

    this.alphabetSongs = filtered;

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
      this.buildAlphabetNav(filtered);
      return;
    }

    const previousScroll =
      preserveScroll
        ? this.availableList.scrollTop
        : 0;

    this.availableList.innerHTML = "";

    let index = 0;
    let lastArtist = null;
    const chunkSize = immediate
      ? 800
      : 150;

    const renderChunk = () => {
      const buffer = [];
      let itemsRendered = 0;

      while (
        index < filtered.length &&
        itemsRendered < chunkSize
      ) {
        const song = filtered[index];
        if (
          song.artist !== lastArtist
        ) {
          lastArtist = song.artist;
          buffer.push(
            `<div class="artist-header">${this.escapeHtml(
              song.artist
            )}</div>`
          );
        }

        buffer.push(
          this.createSongHTML(
            song,
            false
          )
        );
        index += 1;
        itemsRendered += 1;
      }

      this.availableList.insertAdjacentHTML(
        "beforeend",
        buffer.join("")
      );

      if (index < filtered.length) {
        this.pendingRenderFrame =
          window.requestAnimationFrame(
            renderChunk
          );
      } else {
        this.pendingRenderFrame = null;
        this.buildAlphabetNav(filtered);
        if (preserveScroll) {
          this.availableList.scrollTop =
            previousScroll;
        } else {
          this.availableList.scrollTop = 0;
        }
      }
    };

    renderChunk();
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

    this.availableScrollHandler =
      () => {
        // Debounce scroll updates to avoid excessive work
        if (
          this.scrollDebounceTimeout
        ) {
          clearTimeout(
            this.scrollDebounceTimeout
          );
        }
        this.scrollDebounceTimeout =
          setTimeout(() => {
            this.updateCurrentLetter(
              songs
            );
            this.scrollDebounceTimeout =
              null;
          }, 100);
      };

    this.availableList.addEventListener(
      "scroll",
      this.availableScrollHandler
    );

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
    try {
      if (this.isUpdatingLetter) return;
      this.isUpdatingLetter = true;
      if (
        !songs ||
        songs.length === 0
      ) {
        this.updateCurrentArtistBanner(
          null
        );
        return;
      }
      if (
        !this.availableList ||
        !this.alphabetLetters
      ) {
        this.updateCurrentArtistBanner(
          null
        );
        return;
      }

      const scrollTop =
        this.availableList.scrollTop;
      const songElements =
        this.availableList.querySelectorAll(
          ".song-item"
        );

      let currentSong = null;
      for (const element of songElements) {
        const elementTop =
          element.offsetTop -
          this.availableList.offsetTop;
        if (
          elementTop >=
          scrollTop - 50
        ) {
          const artistElement =
            element.querySelector(
              ".song-artist"
            );
          if (!artistElement) continue;

          const artistText =
            artistElement.textContent.replace(
              "🎵 ",
              ""
            );
          currentSong = songs.find(
            (s) =>
              s.artist === artistText
          );
          if (currentSong) {
            break;
          }
        }
      }

      if (!currentSong) {
        this.updateCurrentArtistBanner(
          null
        );
        return;
      }

      this.updateCurrentArtistBanner(
        currentSong
      );

      const firstChar =
        currentSong.artist
          .charAt(0)
          .toUpperCase();
      const letter = /[0-9]/.test(
        firstChar
      )
        ? "#"
        : firstChar;

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
    } catch (error) {
      console.error(
        "Error in updateCurrentLetter:",
        error
      );
    } finally {
      this.isUpdatingLetter = false;
    }
  }

  updateCurrentArtistBanner(song) {
    if (!this.currentArtistBanner) {
      return;
    }

    if (!song) {
      this.currentArtistBanner.textContent =
        "";
      this.currentArtistBanner.classList.add(
        "hidden"
      );
      this.currentArtistBanner.removeAttribute(
        "data-country"
      );
      this.currentArtistBanner.removeAttribute(
        "data-letter"
      );
      return;
    }

    this.currentArtistBanner.textContent =
      song.artist;
    this.currentArtistBanner.classList.remove(
      "hidden"
    );
    this.currentArtistBanner.setAttribute(
      "data-country",
      song.country
    );
    const letter = song.artist
      .charAt(0)
      .toUpperCase();
    this.currentArtistBanner.setAttribute(
      "data-letter",
      /[0-9]/.test(letter)
        ? "#"
        : letter
    );
  }

  /**
   * Scroll to first artist starting with letter
   */
  scrollToLetter(
    letter,
    songs,
    preferredCountry = "Nacional"
  ) {
    try {
      if (
        !songs ||
        songs.length === 0
      ) {
        return;
      }
      if (!this.availableList) {
        return;
      }

      let targetSong = null;

      if (letter === "#") {
        targetSong = songs.find(
          (song) =>
            /[0-9]/.test(
              song.artist.charAt(0)
            ) &&
            song.country ===
              preferredCountry
        );
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
              .toUpperCase() ===
              letter &&
            song.country ===
              preferredCountry
        );
        if (!targetSong) {
          targetSong = songs.find(
            (song) =>
              song.artist
                .charAt(0)
                .toUpperCase() ===
              letter
          );
        }
      }

      if (!targetSong) {
        return;
      }

      const songElements =
        this.availableList.querySelectorAll(
          ".song-item"
        );
      for (const element of songElements) {
        const artistElement =
          element.querySelector(
            ".song-artist"
          );
        if (!artistElement) continue;

        const artistText =
          artistElement.textContent.replace(
            "🎵 ",
            ""
          );
        if (
          artistText ===
          targetSong.artist
        ) {
          element.scrollIntoView({
            block: "start",
            behavior: "auto",
          });

          if (this.alphabetLetters) {
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
            if (letterBtn) {
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
              } else {
                letterBtn.classList.add(
                  "active-internacional"
                );
              }
            }
          }

          this.lastClickedCountry =
            targetSong.country ===
            "Nacional"
              ? "Nacional"
              : "Internacional";
          this.updateCurrentArtistBanner(
            targetSong
          );

          break;
        }
      }
    } catch (error) {
      console.error(
        "Error in scrollToLetter:",
        error
      );
    }
  }

  handleSearchInput(value) {
    const normalized = value
      .trim()
      .toLowerCase();
    if (this.searchDebounceTimeout) {
      window.clearTimeout(
        this.searchDebounceTimeout
      );
    }

    this.searchDebounceTimeout =
      window.setTimeout(
        () => {
          this.searchQuery = normalized;
          const preserveScroll =
            normalized.length === 0;
          this.renderAvailableList({
            preserveScroll,
          });
        },
        normalized.length > 2 ? 120 : 60
      );
  }

  focusSearchInput() {
    if (!this.searchInput) return;
    this.searchInput.focus();
    if (
      typeof this.searchInput.select ===
      "function"
    ) {
      this.searchInput.select();
    }
  }

  fallbackCopy(text, successMessage) {
    const textarea =
      document.createElement(
        "textarea"
      );
    textarea.value = text;
    textarea.setAttribute(
      "readonly",
      "true"
    );
    textarea.style.position =
      "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      const message =
        successMessage ||
        "Copiado para a área de transferência";
      this.showToast(
        message,
        "success"
      );
    } catch (error) {
      this.showToast(
        "Não foi possível copiar automaticamente",
        "error"
      );
    }
    document.body.removeChild(textarea);
  }

  cancelAvailableRender() {
    if (
      this.pendingRenderFrame !== null
    ) {
      window.cancelAnimationFrame(
        this.pendingRenderFrame
      );
      this.pendingRenderFrame = null;
    }
  }

  updateShareButtonsState() {
    const hasSelection =
      this.selectedSongs.length > 0;
    const buttons = [
      this.copyLinkBtn,
      this.clearAllBtn,
    ];
    buttons.forEach((btn) => {
      if (!btn) return;
      if (hasSelection) {
        btn.removeAttribute("disabled");
        btn.setAttribute(
          "aria-disabled",
          "false"
        );
      } else {
        btn.setAttribute(
          "disabled",
          "true"
        );
        btn.setAttribute(
          "aria-disabled",
          "true"
        );
      }
    });
  }

  /**
   * Render both lists
   */
  render() {
    this.renderSelectedList();
    this.renderAvailableList({
      immediate: true,
      preserveScroll: true,
    });
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
