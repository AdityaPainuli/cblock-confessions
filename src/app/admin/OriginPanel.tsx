type Meta = Record<string, string | number | null>;

function Field({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wider text-muted">{label}</dt>
      <dd className="truncate font-mono text-xs text-foreground" title={String(value)}>
        {String(value)}
      </dd>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-maroon/70">
        {title}
      </h4>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</dl>
    </div>
  );
}

/** Everything recorded about where a submission came from, grouped to read. */
export default function OriginPanel({ meta }: { meta: Meta }) {
  if (!Object.keys(meta).length) {
    return (
      <p className="mt-4 border-t border-line pt-4 text-sm text-muted">
        No origin data for this row.
      </p>
    );
  }

  const hasPrecise = meta.precise_lat != null && meta.precise_lon != null;
  const accuracy = meta.precise_accuracy_m;

  return (
    <div className="mt-4 space-y-5 border-t border-line pt-4">
      <Group title="Location">
        {hasPrecise ? (
          <div className="col-span-2 sm:col-span-4">
            <dt className="text-[10px] uppercase tracking-wider text-muted">
              Device GPS
              {accuracy != null && (
                <span className="ml-1.5 normal-case tracking-normal">
                  &plusmn;{Math.round(Number(accuracy))}m
                </span>
              )}
            </dt>
            <dd className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-foreground">
                {Number(meta.precise_lat).toFixed(6)}, {Number(meta.precise_lon).toFixed(6)}
              </span>
              <a
                href={`https://www.google.com/maps?q=${meta.precise_lat},${meta.precise_lon}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-maroon px-2.5 py-0.5 text-[11px] font-medium text-[#fff4e6]"
              >
                Map
              </a>
              <span className="rounded-full bg-[#3f7d5e]/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#2f6047]">
                exact
              </span>
            </dd>
          </div>
        ) : (
          <div className="col-span-2 sm:col-span-4">
            <dt className="text-[10px] uppercase tracking-wider text-muted">Device GPS</dt>
            <dd className="text-xs text-muted">
              Not shared &mdash; the poster declined the browser prompt.
            </dd>
          </div>
        )}

        <Field label="City" value={meta.geo_city} />
        <Field label="Region" value={meta.geo_region} />
        <Field label="Country" value={meta.geo_country} />
        <Field label="Postal" value={meta.geo_postal} />
        <Field label="ISP" value={meta.geo_isp} />
        <Field label="From IP" value={meta.geo_source} />
        {meta.geo_lat != null && meta.geo_lon != null && (
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-muted">
              IP estimate
            </dt>
            <dd>
              <a
                className="font-mono text-xs text-[#2f6b7d] underline"
                href={`https://www.google.com/maps?q=${meta.geo_lat},${meta.geo_lon}`}
                target="_blank"
                rel="noreferrer"
              >
                {Number(meta.geo_lat).toFixed(3)}, {Number(meta.geo_lon).toFixed(3)}
              </a>
            </dd>
          </div>
        )}
      </Group>

      <Group title="Identity">
        <Field label="From block" value={meta.from_block} />
        <Field label="Course" value={meta.from_course} />
        <Field label="IP" value={meta.ip} />
        <Field label="Fingerprint" value={meta.fingerprint} />
      </Group>

      <Group title="Device">
        <Field
          label="Device"
          value={[meta.device_vendor, meta.device_model, meta.device_type]
            .filter(Boolean)
            .join(" ")}
        />
        <Field label="OS" value={[meta.os, meta.os_version].filter(Boolean).join(" ")} />
        <Field
          label="Browser"
          value={[meta.browser, meta.browser_version].filter(Boolean).join(" ")}
        />
        <Field label="Engine" value={meta.engine} />
        <Field label="Screen" value={meta.screen} />
        <Field label="Viewport" value={meta.viewport} />
        <Field label="DPR" value={meta.pixel_ratio} />
        <Field label="Touch points" value={meta.touch_points} />
        <Field label="RAM (GB)" value={meta.device_memory} />
        <Field label="CPU cores" value={meta.cpu_cores} />
        <Field label="GPU" value={meta.gpu} />
        <Field label="Platform" value={meta.platform} />
      </Group>

      <Group title="Context">
        <Field label="Timezone" value={meta.timezone} />
        <Field label="Languages" value={meta.languages} />
        <Field label="Referrer" value={meta.referrer} />
      </Group>

      {!!meta.user_agent && (
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-muted">User agent</dt>
          <dd className="mt-0.5 break-all font-mono text-[11px] leading-relaxed text-foreground">
            {String(meta.user_agent)}
          </dd>
        </div>
      )}
    </div>
  );
}
