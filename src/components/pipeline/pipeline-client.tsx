"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  Building,
  CreditCard,
  MessageSquareText,
  Plus,
  Settings2,
  ShoppingBag,
  Trophy,
  User,
  Wrench,
  XCircle,
} from "lucide-react";
import type { StageDto } from "@/lib/types";
import {
  DEPARTMENTS,
  type DepartmentConfig,
  isUserInDepartment,
  resolveDepartmentIdForStage,
} from "@/lib/departments";
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

const DEPT_ICONS: Record<string, React.ReactNode> = {
  tecnico: <Wrench className="h-4 w-4" />,
  administrativo: <CreditCard className="h-4 w-4" />,
  comercial: <ShoppingBag className="h-4 w-4" />,
  gerencia: <Building className="h-4 w-4" />,
};

export function PipelineClient({
  role = "member",
  userEmail = "",
}: {
  role?: string;
  userEmail?: string;
}) {
  const [departments, setDepartments] = useState<DepartmentConfig[]>(DEPARTMENTS);
  const [selectedDeptId, setSelectedDeptId] = useState<string>("comercial");
  const [stages, setStages] = useState<StageDto[]>([]);
  const [leads, setLeads] = useState<BoardLead[]>([]);
  const [activeLead, setActiveLead] = useState<BoardLead | null>(null);
  const [managing, setManaging] = useState(false);

  const isOwner = role === "owner";
  const normalizedEmail = userEmail.trim().toLowerCase();

  // Cargar departamentos actualizados con sus responsables asignados
  useEffect(() => {
    fetch("/api/settings/departments")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.departments && Array.isArray(data.departments)) {
          setDepartments(data.departments);
          // Si el usuario es miembro, fijar su departamento
          if (!isOwner && normalizedEmail) {
            const myDept = data.departments.find(
              (d: DepartmentConfig) => isUserInDepartment(normalizedEmail, d)
            );
            if (myDept) {
              setSelectedDeptId(myDept.id);
            }
          }
        }
      })
      .catch(() => null);
  }, [isOwner, normalizedEmail]);

  // Si no es owner y no tiene asignado aún, buscar en DEPARTMENTS por defecto
  useEffect(() => {
    if (!isOwner && normalizedEmail) {
      const myDept = departments.find(
        (d) => isUserInDepartment(normalizedEmail, d)
      );
      if (myDept) {
        setSelectedDeptId(myDept.id);
      }
    }
  }, [isOwner, normalizedEmail, departments]);

  const currentDept = useMemo(
    () => departments.find((d) => d.id === selectedDeptId) ?? departments[0],
    [departments, selectedDeptId]
  );

  // Filtrar etapas que corresponden al departamento seleccionado
  const visibleStages = useMemo(() => {
    return stages.filter((s) => {
      const depId = resolveDepartmentIdForStage(s);
      return depId === selectedDeptId;
    });
  }, [stages, selectedDeptId]);

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
      {/* Barra superior de navegación / selector de departamentos */}
      <header className="border-b bg-card px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-lg tracking-tight">Pipelines</h2>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {visibleStages.length} etapas
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setManaging(true)}
              className="gap-1.5"
            >
              <Settings2 className="h-4 w-4" />
              <span>Gestionar etapas</span>
            </Button>
          </div>
        </div>

        {/* Pestañas de departamentos (Owner puede alternar libremente, miembro ve su depto) */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2.5">
          {departments.map((dept) => {
            const isSelected = dept.id === selectedDeptId;
            const deptStageCount = stages.filter(
              (s) => resolveDepartmentIdForStage(s) === dept.id
            ).length;

            if (!isOwner && !isUserInDepartment(normalizedEmail, dept)) {
              return null; // El miembro solo ve departamentos a los que pertenece
            }

            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => setSelectedDeptId(dept.id)}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: isSelected ? "#ffffff" : dept.badgeColor }}
                />
                <span className="truncate">{dept.shortName ?? dept.name}</span>
                <span
                  className={cn(
                    "ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                    isSelected
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted-foreground/15 text-muted-foreground"
                  )}
                >
                  {deptStageCount}
                </span>
                {isOwner && dept.assignedName && (
                  <span
                    className={cn(
                      "hidden sm:inline-block text-[10px] opacity-80",
                      isSelected ? "text-primary-foreground" : "text-muted-foreground"
                    )}
                  >
                    ({dept.assignedName})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Banner del departamento seleccionado con responsable y descripción */}
      {currentDept && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-2.5 text-xs"
          style={{
            backgroundColor: `${currentDept.badgeColor}0d`,
            borderLeft: `4px solid ${currentDept.badgeColor}`,
          }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-md text-white shadow-xs"
              style={{ backgroundColor: currentDept.badgeColor }}
            >
              {DEPT_ICONS[currentDept.id] ?? <ShoppingBag className="h-4 w-4" />}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground text-sm">
                  {currentDept.name}
                </span>
                <span
                  className="rounded px-1.5 py-0.5 text-[10.5px] font-semibold"
                  style={{
                    backgroundColor: `${currentDept.badgeColor}25`,
                    color: currentDept.badgeColor,
                  }}
                >
                  {currentDept.shortName}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {currentDept.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isOwner && isUserInDepartment(normalizedEmail, currentDept) && (
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 shadow-2xs">
                ✓ Tu área asignada
              </span>
            )}
            <div className="flex items-center gap-2 rounded-md border bg-card/80 px-3 py-1 shadow-2xs">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="text-right">
                <div className="font-semibold text-foreground text-[11.5px]">
                  {currentDept.assignedName}
                </div>
                <div className="text-[10.5px] text-muted-foreground">
                  {currentDept.assignedEmail}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tablero Kanban de etapas del departamento */}
      <div className="flex-1 overflow-x-auto p-4">
        <DndContext
          sensors={sensors}
          onDragStart={onDragStart}
          onDragEnd={(e) => void onDragEnd(e)}
        >
          <div className="flex h-full gap-3">
            {visibleStages.map((stage) => (
              <StageColumn
                key={stage.id}
                stage={stage}
                leads={leads
                  .filter((l) => l.stageId === stage.id)
                  .sort((a, b) => a.position - b.position)}
              />
            ))}

            {visibleStages.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                <p className="text-sm font-medium">
                  No hay etapas configuradas en este departamento.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Puedes inicializarlas o agregar una nueva etapa personalizada.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setManaging(true)}
                  className="mt-3 gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Agregar etapa a {currentDept?.shortName ?? "este departamento"}
                </Button>
              </div>
            )}
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
          stages={visibleStages}
          departmentId={selectedDeptId}
          departmentName={currentDept?.name}
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
