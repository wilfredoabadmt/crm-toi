"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { TodoDto } from "@/lib/types";

export function TodosClient() {
  const [todos, setTodos] = useState<TodoDto[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const res = await fetch("/api/todos").catch(() => null);
    if (!res?.ok) return;
    const data = (await res.json()) as { todos: TodoDto[] };
    setTodos(data.todos);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  async function addTodo() {
    const title = newTitle.trim();
    if (!title) return;
    setAdding(true);
    setError(null);
    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    }).catch(() => null);
    setAdding(false);
    if (!res?.ok) {
      setError("No se pudo crear la tarea");
      return;
    }
    setNewTitle("");
    void refetch();
  }

  async function toggleTodo(id: string, completed: boolean) {
    const prev = todos.map((t) => (t.id === id ? { ...t, completed } : t));
    setTodos(prev);
    const res = await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ completed }),
    }).catch(() => null);
    if (!res?.ok) {
      setTodos(todos);
      return;
    }
    void refetch();
  }

  async function deleteTodo(id: string) {
    const prev = todos.filter((t) => t.id !== id);
    setTodos(prev);
    const res = await fetch(`/api/todos/${id}`, { method: "DELETE" }).catch(
      () => null
    );
    if (!res?.ok) {
      setTodos(todos);
      return;
    }
  }

  const openCount = todos.filter((t) => !t.completed).length;
  const doneCount = todos.filter((t) => t.completed).length;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h2 className="font-semibold">Tareas</h2>
          <p className="text-xs text-muted-foreground">
            {openCount} pendiente{openCount !== 1 ? "s" : ""} · {doneCount}
            {" "}completada{doneCount !== 1 ? "s" : ""}
          </p>
        </div>
      </header>

      {error && (
        <p className="px-6 pt-3 text-sm text-destructive">{error}</p>
      )}

      <div className="space-y-2 p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void addTodo();
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="Nueva tarea…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            maxLength={200}
            disabled={adding}
          />
          <Button type="submit" size="sm" disabled={adding || !newTitle.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {todos.length === 0 ? (
        <div className="flex-1 rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Sin tareas. Agregá la primera arriba.
        </div>
      ) : (
        <div className="space-y-1 px-6 pb-6">
          {todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={() => void toggleTodo(todo.id, !todo.completed)}
              onDelete={() => void deleteTodo(todo.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TodoItem({
  todo,
  onToggle,
  onDelete,
}: {
  todo: TodoDto;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(todo.title);
  const [saving, setSaving] = useState(false);

  async function saveEdit() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === todo.title) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      setTitle(todo.title);
      return;
    }
    setEditing(false);
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-md border p-3 transition-colors ${
        todo.completed ? "bg-muted/40" : "bg-card hover:bg-accent/50"
      }`}
    >
      <button
        aria-label="Arrastrar"
        className="cursor-grab text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <button
        onClick={onToggle}
        className="shrink-0 text-muted-foreground hover:text-primary"
        aria-label={todo.completed ? "Marcar como pendiente" : "Marcar como completada"}
      >
        {todo.completed ? (
          <CheckCircle2 className="h-5 w-5 text-success" />
        ) : (
          <Circle className="h-5 w-5" />
        )}
      </button>

      {editing ? (
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void saveEdit();
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={() => void saveEdit()}
          className="flex-1"
          autoFocus
          disabled={saving}
          maxLength={200}
        />
      ) : (
        <span
          className={`flex-1 text-sm ${
            todo.completed ? "line-through text-muted-foreground" : ""
          }`}
          onDoubleClick={() => {
            setTitle(todo.title);
            setEditing(true);
          }}
        >
          {todo.title}
        </span>
      )}

      <div className="flex items-center gap-1">
        {editing ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => void saveEdit()}
            disabled={saving}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => setEditing(true)}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          aria-label="Eliminar tarea"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}