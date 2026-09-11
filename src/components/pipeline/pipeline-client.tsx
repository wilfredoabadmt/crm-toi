"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { MessageSquareText, Settings2, Trophy, XCircle } from "lucide-react";
import type { StageDto } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ContactAvatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/components/inbox/helpers";
import { StageManager } from "./stage-manager";

export type BoardLead = {
  id: string;
  stageId: string;
  position: number;
  lastActivityAt: string | null;
  contact: { id: string; name: string; phone: string };
  conversationId: string | null;
};

export function PipelineClient({ role = "member" }: { role?: string }) {
  const [stages, setStages] = useState<StageDto[]>([]);
  const [leads, setLeads] = useState<BoardLead[]>([]);
  const [activeLead, setActiveLead] = useState<BoardLead | null>(null);
  const [managing, setManaging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const refetch = useCallback(async () => {
    const res = await fetch("/api/pipeline/board").catch(() => null);
    if (!res?.ok) return;
    const data = (await res.json()) as { stages: StageDto[]; leads: BoardLead[] };
    setStages(data.stages);
    setLeads(data.leads);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  function onDragStart(event: DragStartEvent) {
    const lead = leads.find((l) => l.id === event.active.id);
    setActiveLead(lead ?? null);
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveLead(null);
    const leadId = String(event.active.id);
    const overStage = event.over ? String(event.over.id) : null;
    if (!overStage) return;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stageId === overStage) return;

    const position = leads.filter((l) => l.stageId === overStage).length;
    // Optimista + persistencia
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stageId: overStage, position } : l))
    );
    await fetch(`/api/pipeline/leads/${leadId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stageId: overStage, position }),
    });
    void refetch();
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <h2 className="font-semibold">Pipeline</h2>
        {role === "owner" && (
          <Button variant="outline" size="sm" onClick={() => setManaging(true)}>
            <Settings2 className="h-4 w-4" /> Gestionar etapas
          </Button>
        )}
      </header>

      <div className="flex-1 overflow-x-auto p-4">
        <DndContext
          sensors={sensors}
          onDragStart={onDragStart}
          onDragEnd={(e) => void onDragEnd(e)}
        >
          <div className="flex h-full gap-3">
            {stages.map((stage) => (
              <StageColumn
                key={stage.id}
                stage={stage}
                leads={leads
                  .filter((l) => l.stageId === stage.id)
                  .sort((a, b) => a.position - b.position)}
              />
            ))}
          </div>
          <DragOverlay>
            {activeLead ? (
              <LeadCard
                lead={activeLead}
                stage={stages.find((s) => s.id === activeLead.stageId)}
                overlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {managing && (
        <StageManager
          stages={stages}
          onClose={() => setManaging(false)}
          onChanged={() => void refetch()}
        />
      )}
    </div>
  );
}

function StageColumn({ stage, leads }: { stage: StageDto; leads: BoardLead[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const color = stage.badgeColor ?? "#9ca3af";

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full w-64 shrink-0 flex-col rounded-lg border bg-card/50",
        isOver && "ring-2 ring-primary/60"
      )}
    >
      <div className="border-b px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm font-semibold truncate">
            {stage.kind === "won" && <Trophy className="h-3.5 w-3.5 shrink-0 text-primary" />}
            {stage.kind === "lost" && (
              <XCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate">{stage.name}</span>
          </span>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground shrink-0 font-medium">
            {leads.length}
          </span>
        </div>

        {stage.assignedName && (
          <div
            className="mt-2 flex items-center justify-between gap-1.5 rounded-md border px-2 py-1 text-xs"
            style={{
              borderColor: `${color}35`,
              backgroundColor: `${color}12`,
            }}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-xs"
                style={{ backgroundColor: color }}
              >
                {stage.assignedName.charAt(0)}
              </span>
              <span
                className="truncate font-semibold text-[11.5px]"
                style={{ color }}
              >
                {stage.assignedName}
              </span>
            </div>
            <span
              className="rounded px-1.5 py-0.2 text-[9.5px] font-semibold shrink-0"
              style={{
                backgroundColor: `${color}22`,
                color: color,
              }}
            >
              Responsable
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {leads.map((lead) => (
          <DraggableLead key={lead.id} lead={lead} stage={stage} />
        ))}
      </div>
    </div>
  );
}

function DraggableLead({ lead, stage }: { lead: BoardLead; stage?: StageDto }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(isDragging && "opacity-40")}
    >
      <LeadCard lead={lead} stage={stage} />
    </div>
  );
}

function LeadCard({
  lead,
  stage,
  overlay = false,
}: {
  lead: BoardLead;
  stage?: StageDto;
  overlay?: boolean;
}) {
  return (
    <div
      className={cn(
        "cursor-grab rounded-md border bg-card p-3 shadow-sm transition-all hover:border-brand/40",
        overlay && "rotate-2 shadow-xl"
      )}
    >
      <div className="flex items-center gap-2.5">
        <ContactAvatar name={lead.contact.name} seed={lead.contact.id} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{lead.contact.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {lead.lastActivityAt
              ? `Actividad: ${formatTime(lead.lastActivityAt)}`
              : "Sin actividad"}
          </p>
        </div>
        {lead.conversationId && (
          <Link
            href={`/inbox?contact=${lead.contact.id}`}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Abrir conversación"
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <MessageSquareText className="h-4 w-4" />
          </Link>
        )}
      </div>

      {stage?.assignedName && (
        <div className="mt-2 flex items-center gap-1.5 border-t border-border/50 pt-1.5 text-[10.5px] text-muted-foreground">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: stage.badgeColor ?? "#9ca3af" }}
          />
          <span className="truncate">
            Atiende: <strong className="font-semibold text-foreground">{stage.assignedName}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
