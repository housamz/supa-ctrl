import { CircleAlert, CheckCircle2, Info } from "lucide-react";

const config = {
  success: { bg: "bg-green-50 border-green-200", text: "text-green-800", Icon: CheckCircle2 },
  error:   { bg: "bg-red-50 border-red-200",     text: "text-red-800",   Icon: CircleAlert },
  info:    { bg: "bg-blue-50 border-blue-200",   text: "text-blue-800",  Icon: Info },
};

export function Toasts({ toasts, dismiss }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const cfg = config[toast.type] || config.info;
        return (
          <div
            key={toast.id}
            onClick={() => dismiss(toast.id)}
            className={`flex items-start gap-2.5 px-4 py-3 rounded-lg border shadow-md cursor-pointer ${cfg.bg}`}
          >
            <cfg.Icon size={15} className={`${cfg.text} mt-0.5 shrink-0`} />
            <span className={`text-sm leading-snug ${cfg.text}`}>{toast.msg}</span>
          </div>
        );
      })}
    </div>
  );
}
