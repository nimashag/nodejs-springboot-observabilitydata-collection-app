import type { ReactNode } from "react";

export function Drawer({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="drawerOverlay" onMouseDown={onClose}>
      <div className="drawer" onMouseDown={(e) => e.stopPropagation()}>
        <div className="drawerTop">
          <div>
            <div className="drawerTitle">{title}</div>
            {subtitle ? <div className="drawerSub">{subtitle}</div> : null}
          </div>
          <button className="iconBtn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="drawerBody">{children}</div>
      </div>
    </div>
  );
}
