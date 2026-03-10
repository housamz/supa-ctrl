import { useEffect } from "react";
import { X } from "lucide-react";

export function Modal({ title, onClose, children, width = "max-w-lg" }) {
  useEffect(() => {
    const handler = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-xl border border-gray-200 shadow-xl w-full ${width} max-h-[88vh] flex flex-col overflow-hidden`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="font-semibold text-gray-900">{title}</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded p-1"
          >
            <X size={15} />
          </button>
        </div>
        <div className="overflow-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

