import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function DeleteConfirmButton({
  onConfirm,
  title = "Delete Item",
  description = "Are you sure you want to delete this item? This action cannot be undone.",
  buttonText = "Delete",
  className = "",
  icon: Icon = Trash2,
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async (e) => {
    e?.stopPropagation();
    try {
      setLoading(true);
      await onConfirm();
      setOpen(false);
    } catch (error) {
      console.error(error);
      // Usually API handles alert or we can let parent catch, but we ensure dialog doesn't lock
    } finally {
      if (document.body.style.pointerEvents === "none") {
        document.body.style.pointerEvents = "auto";
      }
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={`gap-1.5 text-xs px-3 py-1.5 h-8 transition-all cursor-pointer duration-150 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 ${className}`}
      >
        <Icon className="h-3.5 w-3.5" />
        {buttonText && <span>{buttonText}</span>}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="cursor-pointer hover:bg-gray-200"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              className="cursor-pointer hover:bg-red-800"
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
