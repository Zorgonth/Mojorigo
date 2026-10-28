import "./App.css";
import GlassFilters from "./components/GlassFilters";
import SearchBar from "./components/SearchBar";
import NearbyBins from "./components/NearbyBins";
import Navigation from "./components/Navigation";
import HeaderControls from "./components/HeaderControls";

function App() {
  return (
    <main className="glass-app">

      {/* Blurred background */}
      <div className="glass-background" />

      {/* G.L.A.S.S logo */}
      <header className="glass-header">
        <div className="glass-logo">
          G.<span className="logo-l">L</span>.A.S.S

        </div>

        {/* Navigation placeholder */}
        <Navigation />

        <HeaderControls />
      </header>

      {/* Main content */}
      <div className="glass-layout">

        <aside className="glass-sidebar">
          <div className="sidebar-intro">
            <h1>Find a glass<br />bin near you</h1>
            <p>
              Check the current fill level of glass recycling
              containers in your area.
            </p>
          </div>

          <SearchBar />

          <GlassFilters />

          <NearbyBins bins={[]} />
        </aside>

        {/* Reserved map area */}
        <section
          className="glass-map"
          aria-label="Map area"
        />

      </div>

    </main>
  );
}

export default App;