"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "../../lib/supabase";
import { lucroBilhete } from "../../lib/types";

export default function BilhetesPage() {
  const [tickets, setTickets] = useState([]);
  const [msg, setMsg] = useState("");

  async function load() {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setMsg(error.message);
    else setTickets(data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(ticket, status_usuario) {
    const supabase = getSupabase();
    const lucro = lucroBilhete({ ...ticket, status_usuario });
    const { error } = await supabase
      .from("tickets")
      .update({ status_usuario, lucro })
      .eq("id", ticket.id);
    if (error) setMsg(error.message);
    else load();
  }

  return (
    <section className="card">
      <h2>Bilhetes</h2>
      <p>Green e Red são você quem marca. Confirmar no bot só trava o JSON.</p>
      <p>{msg}</p>
      <table>
        <thead>
          <tr>
            <th>ID casa</th>
            <th>Título</th>
            <th>Valor</th>
            <th>Odd</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {tickets.length === 0 ? (
            <tr>
              <td colSpan={6}>Nenhum bilhete. Importe o JSON do Telegram.</td>
            </tr>
          ) : (
            tickets.map((ticket) => (
              <tr key={ticket.id}>
                <td>{ticket.id_casa ?? "—"}</td>
                <td>{ticket.titulo ?? ticket.jogo ?? "—"}</td>
                <td>{Number(ticket.valor_apostado ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                <td>{ticket.odd_bilhete ?? "—"}</td>
                <td>{ticket.status_usuario}</td>
                <td>
                  <button className="green" onClick={() => setStatus(ticket, "green")}>
                    Green
                  </button>{" "}
                  <button className="red" onClick={() => setStatus(ticket, "red")}>
                    Red
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
