function init() {
  showPokemons();
}

let responseAsPokemon = [];

async function showPokemons() {
  const pokemonContainer = document.getElementById("pokemon-container");
  try {
    let response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=16");
    let data = await response.json();
    responseAsPokemon = data.results;
    renderPoks(responseAsPokemon);
  } catch (error) {
    console.error("Fehler beim Laden der Pokémon:", error);
  }
}

function renderPoks(pokemonList) {
  const container = document.getElementById("pokemon-container");
  container.innerHTML = "";

  pokemonList.forEach((pokemon, index) => {
    const id = extractPokemonId(pokemon.url); // z.B. 1, 2, 3
    const capitalizedName =
      pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
    container.innerHTML += `
      <div class="pokemon-box">
        <div id="pokemon-name"> <h3>#${id} ${capitalizedName}</h3></div> 
      <div><img id="pokemon-img" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png" alt="${pokemon.name}" /></div>
      </div>
    `;
  });
}

function extractPokemonId(url) {
  // Extrahiert die ID aus z. B. "https://pokeapi.co/api/v2/pokemon/1/"
  const parts = url.split("/");
  return parts[parts.length - 2]; // "1"
}
