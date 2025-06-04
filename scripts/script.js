let offset = 0;
const limit = 20;
const responseAsPokemon = [];
let currentIndex = 0;
import { typeColors, typeEmojis } from "./db.js";

function init() {
  showPokemons();
  setupEventListeners();
}

function setupEventListeners() {
  document.getElementById("load-more-button").addEventListener("click", showPokemons);
  document.getElementById("search-input").addEventListener("input", debounce(searchInput, 300));
  document.getElementById("back-to-home").addEventListener("click", () => {
    const container = document.getElementById("pokemon-container");
    const message = document.getElementById("search-message");
    const searchInput = document.getElementById("search-input");
    searchInput.value = "";
    resetSearch(container, message);
    document.getElementById("back-to-home").classList.add("hidden");
    document.querySelector("#load-more-button").classList.remove("hidden");
  });
  setupModalCloseHandlers();
}

function setupModalCloseHandlers() {
  document.getElementById("modal").addEventListener("click", (e) => {
    if (e.target.id === "modal") closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
  document.querySelector(".close-button").addEventListener("click", closeModal);
}

async function fetchPokemons(offset, limit) {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`);
  return await res.json();
}

async function renderPoks(pokemonList) {
  for (const pokemon of pokemonList) {
    const id = extractPokemonId(pokemon.url);
    const name = capitalizeName(pokemon.name);
    await renderSinglePokemon(id, name, pokemon.name);
  }
}

async function renderSinglePokemon(id, name, originalName) {
  const container = document.getElementById("pokemon-container");
  try {
    const data = await fetchPokemonData(id);
    const types = data.types.map(t => t.type.name);
    const bgColor = getTypeColor(types[0]);
    const badges = createTypeBadges(types);
    container.innerHTML += createPokemonCard(id, name, originalName, bgColor, badges);
  } catch (err) {
    console.error(`Fehler beim Laden von ${originalName}:`, err);
  }
}

function renderMainTab(container, types, data) {
  const typesText = types.join(", ");
  container.innerHTML = `
    <ul class="main-tab-list">
      <li><span class="label">Types:</span> ${typesText}</li>
      <li><span class="label">Height:</span> ${data.height}</li>
      <li><span class="label">Weight:</span> ${data.weight}</li>
      <li><span class="label">Base EXP:</span> ${data.base_experience}</li>
    </ul>
  `;
}

async function renderEvoTab(container, id) {
  try {
    const evoChain = await getEvolutionChain(id);
    const evoHtml = await Promise.all(
      evoChain.map((name, index) => createEvoItem(name, index, evoChain.length))
    );
    container.innerHTML = `<div class="evo-chain">${evoHtml.join("")}</div>`;
  } catch (err) {
    console.error("Evolution chain error:", err);
    container.innerHTML = `<p>Could not load evolution chain.</p>`;
  }
}

function resetSearch(container, message) {
  message.textContent = "";
  container.innerHTML = "";
  renderPoks(responseAsPokemon);
}

function renderStatusTab(container, data) {
  if (!window.Chart) {
    const stats = data.stats.map(s =>
      `<li><strong>${s.stat.name}:</strong> ${s.base_stat}</li>`
    ).join("");
    container.innerHTML = `<ul>${stats}</ul>`;
    return;
  }
  container.innerHTML = `<canvas id="statsChart" width="250" height="100"></canvas>`;
  drawStatsChart(data.stats);
}

function capitalizeName(name) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function getTypeColor(type) {
  return typeColors[type] || "#777";
}

function createTypeBadges(types) {
  return types.map(t => `<span class="type-badge" style="font-size:36px">${typeEmojis[t] || ""}</span>`).join(" ");
}

function createPokemonCard(id, name, rawName, bg, badgesHTML) {
  return `
    <div class="pokemon-box" style="background-color: ${bg};">
      <div id="pokemon-name"><h3>#${id} ${name}</h3></div> 
      <div id="pok">
        <img id="pokemon-img" loading="lazy"
          src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png"
          alt="${rawName}"
          onclick="openModal('${name}', '${id}')"
        />
      </div>
      <div class="type-container" id="badges-size">${badgesHTML}</div>
    </div>
  `;
}

function searchInput(event) {
  const value = event.target.value.toLowerCase();
  const container = document.getElementById("pokemon-container");
  const message = document.getElementById("search-message");
  if (value.length >= 3) handleSearch(container, message, value);
  else if (value.length === 0) resetSearch(container, message);
  else message.textContent = "Bitte mindestens 3 Buchstaben eingeben.";
  document.querySelector("#load-more-button").classList.add("hidden");
}

function handleSearch(container, message, term) {
  message.textContent = "";
  const results = responseAsPokemon.filter(p => p.name.includes(term));
  container.innerHTML = "";
  const backButton = document.getElementById("back-to-home");
  backButton.classList.remove("hidden");
  document.querySelector("#load-more-button").classList.add("hidden");
  if (results.length > 0) {
    renderPoks(results);
  } else {
    container.innerHTML = "<p class='keine-pokemon'>Keine Pokémon gefunden.</p>";
  }
}

async function openModal(name, id) {
  const modal = document.getElementById("modal");
  const modalContent = document.getElementById("modal-content");
  currentIndex = responseAsPokemon.findIndex(p => extractPokemonId(p.url) == id);
  const data = await fetchPokemonData(id);
  const types = data.types.map(t => t.type.name);
  const bgColor = getTypeColor(types[0]);
  fillModalContent(modalContent, name, id, bgColor);
  setupModalTabs(modalContent, id, data, types);
  modal.classList.remove("hidden");
  setupModalNavigation();
}

window.openModal = openModal;

function fillModalContent(container, name, id, bgColor) {
  container.style.backgroundColor = bgColor;
  container.innerHTML = `
    <span class="close-button">&#10006;</span>
    <div id="modal-body" class="fade-in">
      <h2 id="modal-title">#${id} ${name}</h2>
      <img id="modal-image" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png" alt="Pokemon" />
      <div class="nav-buttons">
        <button id="prev-button"><img class="link-rechts" src="./img/links.png"></button>
        <button id="next-button"> <img  class="link-rechts" src="./img/rechts.png"></button>
      </div>
      <div id="abilities">
        <nav id="menu-abilities">
          <button data-type="main">main</button>
          <button data-type="status">status</button>
          <button data-type="evo-chain">evo chain</button>
        </nav>
      </div>
      <div id="modal-info" style="margin-top: 15px;"></div>
    </div>
  `;
}

function setupModalNavigation() {
  const prevBtn = document.getElementById("prev-button");
  const nextBtn = document.getElementById("next-button");
  prevBtn.addEventListener("click", () => {
    currentIndex = (currentIndex - 1 + responseAsPokemon.length) % responseAsPokemon.length;
    const poke = responseAsPokemon[currentIndex];
    const id = extractPokemonId(poke.url);
    const name = capitalizeName(poke.name);
    openModal(name, id);
  });

  nextBtn.addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % responseAsPokemon.length;
    const poke = responseAsPokemon[currentIndex];
    const id = extractPokemonId(poke.url);
    const name = capitalizeName(poke.name);
    openModal(name, id);
  });
}

function setupModalTabs(container, id, data, types) {
  const buttons = container.querySelectorAll("#menu-abilities button");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      loadTabContent(btn.dataset.type, id, data, types);
    });
  });
  buttons[0].classList.add("active");
  loadTabContent("main", id, data, types);
  container.querySelector(".close-button").addEventListener("click", closeModal);
}

async function loadTabContent(type, id, data = null, types = []) {
  const info = document.getElementById("modal-info");
  info.innerHTML = "Loading...";
  if (!data || types.length === 0) {
    data = await fetchPokemonData(id);
    types = data.types.map(t => t.type.name);
  }
  if (type === "main") return renderMainTab(info, types, data);
  if (type === "status") return renderStatusTab(info, data);
  if (type === "evo-chain") return renderEvoTab(info, id);
}

async function showPokemons() {
  const loader = document.getElementById("loader");
  loader.classList.remove("hidden");
  try {
    const data = await fetchPokemons(offset, limit);
    responseAsPokemon.push(...data.results);
    await renderPoks(data.results);
    offset += limit;
  } catch (error) {
    console.error("Fehler beim Laden der Pokémon:", error);
  } finally {
    loader.classList.add("hidden");
  }
}

async function createEvoItem(name, index, total) {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
  const data = await res.json();
  const pokeId = data.id;
  const imgUrl = data.sprites.other["official-artwork"].front_default;
  const cardHtml = `
    <div class="evo-item">
     <div class="evo-entry">
   <img src="${imgUrl}" alt="${name}" class="evo-img" />
</div>
    </div>
  `;
  const arrowHtml = (index !== total - 1)
    ? `<div class="evo-arrow"></div>`
    : "";
  return cardHtml + arrowHtml;
}

async function getEvolutionChain(id) {
  const res1 = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
  const species = await res1.json();
  const evoUrl = species.evolution_chain.url;
  const res2 = await fetch(evoUrl);
  const evoData = await res2.json();
  let evoChain = [], evo = evoData.chain;
  do {
    evoChain.push(evo.species.name);
    evo = evo.evolves_to[0];
  } while (evo && evo.hasOwnProperty("evolves_to"));
  return evoChain;
}

async function fetchPokemonData(id) {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  return await res.json();
}

function extractPokemonId(url) {
  const parts = url.split("/");
  return parts[parts.length - 2];
}

function closeModal() {
  document.getElementById("modal").classList.add("hidden");
}

function debounce(fn, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

function drawStatsChart(stats) {
  const ctx = document.getElementById("statsChart").getContext("2d");
  const labels = stats.map(s => s.stat.name);
  const values = stats.map(s => s.base_stat);
  new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Base Stats",
        data: values,
        backgroundColor: "rgba(98, 90, 92, 0.2)",
        borderColor: "rgb(214, 83, 111)",
        borderWidth: 2,
        pointBackgroundColor: "rgb(124, 124, 151)"
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          ticks: {
            color: "#073621",
            font: {
              size: 15
            }
          }
        },
        y: {
          ticks: {
            color: "#073621",
            font: {
              size: 15
            }
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

window.addEventListener("DOMContentLoaded", init);