export type GlassBin = {
  id: string;
  name: string;
  address: string;
  distance?: number;
  colors: ("Brown" | "White" | "Green")[];
};

type NearbyBinsProps = {
  bins: GlassBin[];
};

export default function NearbyBins({ bins }: NearbyBinsProps) {
  return (
    <section className="nearby-bins" aria-labelledby="nearby-bins-title">
      <h2 id="nearby-bins-title">Nearby glass bins</h2>

      <div className="nearby-bins-list">
        {bins.length === 0 ? (
          <p className="nearby-bins-empty">
            Search for a postcode or use your current location
            to find nearby glass containers.
          </p>
        ) : (
          bins.map((bin) => (
            <div className="nearby-bin-card" key={bin.id}>
              <div>
                <h3>{bin.name}</h3>
                <p>{bin.address}</p>
              </div>

              {bin.distance !== undefined && (
                <span>{bin.distance} m</span>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}