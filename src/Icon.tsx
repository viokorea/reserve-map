export default function Icon({ name, size = 20, ...props }: { name: string; size?: number } & React.SVGProps<SVGSVGElement>) {
  const paths: Record<string, React.ReactNode> = {
    pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>,
    back: <path d="M19 12H5m6-6-6 6 6 6"/>,
    external: <><path d="M14 3h7v7m0-7L10 14"/><path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/></>,
    chevron: <path d="m8 4 8 8-8 8"/>,
    down: <path d="m6 9 6 6 6-6"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    phone: <path d="M21 16v3a2 2 0 0 1-2.2 2A18 18 0 0 1 3 5.2 2 2 0 0 1 5 3h3l2 5-2 2a14 14 0 0 0 6 6l2-2Z"/>,
    layers: <><path d="m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 16l10 5 10-5"/></>,
    reset: <><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/></>,
    locate: <><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></>,
    share: <><path d="M12 16V3m-5 5 5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></>,
    filter: <><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13M3 6h.1M3 12h.1M3 18h.1"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    minus: <path d="M5 12h14"/>,
    file: <><path d="M14 2H5v20h14V7Zm0 0v5h5M8 12h8m-8 4h6"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] ?? paths.pin}</svg>;
}
