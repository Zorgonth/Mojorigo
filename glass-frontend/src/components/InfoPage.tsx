import { ArrowRight, Check, Clock3, Info, Recycle, X } from "lucide-react";
const sources = {
  local: "https://abfallwirtschaft.heilbronn.de/abfallentsorgung/abfallannahme/depotcontainer/altglas",
  federal: "https://www.bundesumweltministerium.de/themen/kreislaufwirtschaft/abfallarten-und-abfallstroeme/altglas/altglas-verbrauchertipp",
  uba: "https://www.umweltbundesamt.de/umwelttipps-fuer-den-alltag/altglas-richtig-trennen-entsorgen",
  sorting: "https://www.muelltrennung-wirkt.de/fileadmin/user_upload/Downloads/Trenntabellen_03-2025/Deutsch/250303_dS_Trenntabellen_digiNutzung_Gesamt.pdf",
};
export default function InfoPage({ section, onFind }: { section: "about" | "recycling"; onFind: () => void }) {
 return <section className="info-page" aria-labelledby="info-page-title" key={section}>
  <div className="info-hero"><span className="info-eyebrow">{section === "about" ? <Info size={17}/> : <Recycle size={17}/>} G.L.A.S.S · HEILBRONN</span>
   <h1 id="info-page-title">{section === "about" ? "About G.L.A.S.S" : <>Small habits.<br/>Better glass recycling.</>}</h1>
   <p>{section === "about" ? "Glass recycling near you." : "A practical guide to sorting glass in Germany, with the local rules for your next trip in Heilbronn."}</p>
   <button className="info-find" onClick={onFind}>Find a container <ArrowRight size={17}/></button>
  </div>
  {section === "about" ? <article className="info-card about-placeholder"><span className="info-eyebrow">OUR STORY</span><h2>More about the project, soon.</h2><p>This space is reserved for the project’s story, team and mission. More information will be added here.</p></article> : <>
   <aside className="info-hours"><Clock3 size={25}/><div><h2>Heilbronn: Monday–Saturday, 08:00–19:00</h2><p>No glass disposal on Sundays or public holidays. Check the signs at your container; local rules elsewhere can differ.</p><a href={sources.local} target="_blank" rel="noreferrer">City of Heilbronn · disposal rules ↗</a></div></aside>
   <section className="info-section" aria-labelledby="sort-heading"><div className="info-section-heading"><span className="info-eyebrow">01 · SORT BY COLOUR</span><h2 id="sort-heading">Three colours. One simple rule.</h2></div>
    <div className="info-colours">{[{name:"White",de:"Weißglas",style:"white",body:"Clear, colourless glass bottles and jars go here."},{name:"Brown",de:"Braunglas",style:"brown",body:"Keep brown bottles and jars separate from other colours."},{name:"Green",de:"Grünglas",style:"green",body:"Green, blue and other colours go here. Unsure of the colour? Choose green."}].map(c => <article className="info-card" key={c.name}><span className={`info-glass-swatch ${c.style}`}/><h3>{c.name} glass</h3><span className="info-german">{c.de}</span><p>{c.body}</p></article>)}</div>
    <a className="info-source" href={sources.federal} target="_blank" rel="noreferrer">Source: Federal Environment Ministry ↗</a>
   </section>
   <section className="info-section" aria-labelledby="what-heading"><span className="info-eyebrow">02 · PACKAGING GLASS ONLY</span><h2 id="what-heading">Not everything made of glass belongs here.</h2>
    <div className="info-two-columns"><article className="info-card"><h3><Check size={20}/> Yes, these belong</h3><ul><li>Empty non-deposit drink bottles</li><li>Jam, pickle and sauce jars</li><li>Glass oil and vinegar bottles</li><li>Empty glass perfume bottles</li></ul></article><article className="info-card"><h3><X size={20}/> Keep these out</h3><ul><li>Drinking glasses, crystal and vases</li><li>Oven dishes and heat-resistant glass</li><li>Ceramics, porcelain and stoneware</li><li>Windows, mirrors and light bulbs</li></ul></article></div><p className="info-footnote">Different glass types can spoil the recycling process. Ask your local waste service how to dispose of excluded items; lamps need their own collection route.</p><a className="info-source" href={sources.uba} target="_blank" rel="noreferrer">Source: German Environment Agency ↗</a>
   </section>
   <section className="info-section" aria-labelledby="tips-heading"><span className="info-eyebrow">03 · BEFORE YOU GO</span><h2 id="tips-heading">A little preparation goes a long way.</h2><div className="info-two-columns">
    <article className="info-card"><h3>Return Pfand bottles first</h3><p>Return deposit bottles through the appropriate return system. Refillable bottles can be reused before they need recycling.</p><a className="info-source" href={sources.uba} target="_blank" rel="noreferrer">German Environment Agency ↗</a></article>
    <article className="info-card"><h3>Empty them. Skip the rinse.</h3><p>Remove the contents and scrape out food leftovers. There is no need to wash bottles or jars specially for recycling.</p><a className="info-source" href={sources.federal} target="_blank" rel="noreferrer">Federal Environment Ministry ↗</a></article>
    <article className="info-card"><h3>What about lids?</h3><p>Lids can stay on. If you remove them, sort them into the appropriate packaging collection. Never leave loose lids on top of a container.</p><a className="info-source" href={sources.sorting} target="_blank" rel="noreferrer">Dual systems · glass sorting guide ↗</a></article>
    <article className="info-card"><h3>Full container? Try another.</h3><p>Take your glass to another location or bring it home. Leave no bottles, bags or boxes beside the containers. Oversized bottles can go to a Heilbronn recycling centre.</p><a className="info-source" href={sources.local} target="_blank" rel="noreferrer">City of Heilbronn ↗</a></article>
   </div></section>
   <footer className="info-footer"><p>Guidance checked on 28 October 2026. Local signage and municipal disposal instructions take priority.</p><button className="info-find" onClick={onFind}>Find your nearest container <ArrowRight size={17}/></button></footer>
  </>}
 </section>;
}
