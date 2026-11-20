import { FormEvent, useEffect, useState } from "react";
import {
  Activity,
  Blocks,
  CalendarClock,
  CheckCircle2,
  FileClock,
  Plus,
  ShieldCheck,
  Users,
  Vote,
} from "lucide-react";
import { DashboardLayout } from "../components/Layout";
import {
  Alert,
  Empty,
  Spinner,
  Status,
  statusFor,
  short,
} from "../components/UI";
import { PageTitle } from "./VoterPages";
import { api } from "../services/api";
import { blockchainErrorMessage, votingContract } from "../services/blockchain";
import type { Election } from "../types";
function useAdminData() {
  const [elections, setElections] = useState<Election[]>([]);
  const refresh = () =>
    api.get("/elections").then((x) => setElections(x.data.elections));
  useEffect(() => {
    refresh();
  }, []);
  return { elections, refresh };
}
export function AdminDashboard() {
  const [stats, setStats] = useState<any>();
  const { elections } = useAdminData();
  useEffect(() => {
    api
      .get("/elections/stats")
      .then((x) => setStats(x.data))
      .catch(() => {});
  }, []);
  return (
    <DashboardLayout>
      <PageTitle
        title="Election command center"
        subtitle="Monitor identity, participation, and blockchain state."
      />
      <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [Vote, stats?.totalElections ?? "—", "Elections"],
          [Users, stats?.totalVoters ?? "—", "Verified voters"],
          [Blocks, stats?.totalVotes ?? "—", "Committed votes"],
          [Activity, stats?.activeElections ?? "—", "Active now"],
        ].map(([Icon, v, l]: any) => (
          <div className="card" key={l}>
            <Icon className="text-teal" />
            <p className="mt-5 text-3xl font-bold">{v}</p>
            <p className="mt-1 text-sm text-slate-500">{l}</p>
          </div>
        ))}
      </div>
      <div className="card mt-7">
        <h2 className="text-xl font-bold">Election status</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="pb-3">Election</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Schedule</th>
              </tr>
            </thead>
            <tbody>
              {elections.map((e) => (
                <tr className="border-t" key={e._id}>
                  <td className="py-4 font-semibold">{e.title}</td>
                  <td>
                    <Status value={statusFor(e)} />
                  </td>
                  <td>
                    {new Date(e.startTime).toLocaleDateString()} –{" "}
                    {new Date(e.endTime).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
export function AdminElections() {
  const { elections, refresh } = useAdminData();
  const [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [busy, setBusy] = useState(false);
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    const f = Object.fromEntries(new FormData(form));
    try {
      const startTime = +new Date(String(f.startTime));
      const endTime = +new Date(String(f.endTime));
      if (startTime < Date.now() + 60_000) {
        throw new Error("Choose a start time at least 1 minute in the future");
      }
      if (endTime <= startTime) {
        throw new Error("End time must be after the start time");
      }
      const { contract, send } = await votingContract();
      const tx = await send(
        "createElection",
        f.title,
        f.description,
        Math.floor(startTime / 1000),
        Math.floor(endTime / 1000),
      );
      const receipt = await tx.wait();
      const onChainId = Number(await contract.electionCount());
      await api.post("/elections", {
        onChainId,
        title: f.title,
        description: f.description,
        txHash: receipt.hash,
      });
      setSuccess(`Election #${onChainId} created on-chain.`);
      form.reset();
      refresh();
    } catch (x: any) {
      setError(blockchainErrorMessage(x));
    } finally {
      setBusy(false);
    }
  }
  async function action(election: Election, action: string) {
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const { send } = await votingContract();
      if (action === "publish") {
        const { data } = await api.get(`/admin/elections/${election.onChainId}/pending-reveals`);
        const pending = data.pending as Array<{ ballotId: string; candidateId: number; salt: string; voter: string }>;
        for (let index = 0; index < pending.length; index++) {
          const ballot = pending[index];
          setSuccess(`Revealing sealed ballot ${index + 1} of ${pending.length} before publishing…`);
          const revealTx = await send("revealVote", election.onChainId, ballot.candidateId, ballot.salt, ballot.voter);
          const revealReceipt = await revealTx.wait();
          await api.post(`/admin/ballots/${ballot.ballotId}/confirm-reveal`, { txHash: revealReceipt.hash });
        }
      }
      const tx =
        action === "start"
          ? await send("startElection", election.onChainId)
          : action === "pause"
            ? await send("pauseElection", election.onChainId)
            : action === "end"
              ? await send("endElection", election.onChainId)
              : await send("publishResults", election.onChainId);
      const r = await tx.wait();
      await api.post(`/elections/${election.onChainId}/lifecycle`, {
        action:
          action === "start"
            ? "started"
            : action === "pause"
              ? "paused"
              : action === "end"
                ? "ended"
                : "published",
        txHash: r.hash,
      });
      setSuccess(`${action} transaction confirmed.`);
      await refresh();
    } catch (x: any) {
      setError(blockchainErrorMessage(x));
    } finally {
      setBusy(false);
    }
  }
  return (
    <DashboardLayout>
      <PageTitle
        title="Election management"
        subtitle="Create and control elections through the administrator wallet."
      />
      <div className="mt-7 grid gap-7 xl:grid-cols-[.85fr_1.15fr]">
        <form onSubmit={create} className="card space-y-4">
          <h2 className="text-xl font-bold">Create election</h2>
          <p className="rounded-xl bg-mint px-4 py-3 text-sm text-teal">
            Choose the schedule manually. Add all candidates and eligible voters before the selected start time.
          </p>
          {error && <Alert>{error}</Alert>}
          {success && <Alert tone="success">{success}</Alert>}
          <label className="label">
            Title
            <input className="input" name="title" required minLength={3} />
          </label>
          <label className="label">
            Description
            <textarea className="input min-h-24" name="description" />
          </label>
          <label className="label">
            Starts
            <input
              className="input"
              type="datetime-local"
              name="startTime"
              min={localDateTimeValue(new Date())}
              required
            />
          </label>
          <label className="label">
            Ends
            <input
              className="input"
              type="datetime-local"
              name="endTime"
              min={localDateTimeValue(new Date())}
              required
            />
          </label>
          <button className="btn w-full justify-center bg-teal py-3 text-white">
            {busy ? (
              <Spinner />
            ) : (
              <>
                <Plus size={18} />
                Create on Ethereum
              </>
            )}
          </button>
        </form>
        <div className="space-y-4">
          {elections.map((e) => (
            <div className="card" key={e._id}>
              <div className="flex justify-between gap-3">
                <div>
                  <b>{e.title}</b>
                  <p className="mt-1 text-sm text-slate-500">
                    Chain election #{e.onChainId}
                  </p>
                </div>
                <Status value={statusFor(e)} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(["start", "pause", "end", "publish"] as const).map((x) => {
                  const gate = lifecycleGate(e, x);
                  return (
                    <button
                      key={x}
                      onClick={() => action(e, x)}
                      disabled={busy || gate.disabled}
                      title={gate.reason}
                      className="btn border border-slate-200 capitalize hover:border-teal disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {x}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

type LifecycleAction = "start" | "pause" | "end" | "publish";

function lifecycleGate(election: Election, action: LifecycleAction) {
  const now = Date.now();
  const start = new Date(election.startTime).getTime();
  const end = new Date(election.endTime).getTime();
  if (action === "start") {
    if (election.status !== "draft" && election.status !== "paused")
      return { disabled: true, reason: "Only a draft or paused election can be started" };
    if (election.candidates.length < 2)
      return { disabled: true, reason: "Add at least two candidates before starting" };
    if (now < start)
      return { disabled: true, reason: "Wait until the selected start time" };
    if (now >= end)
      return { disabled: true, reason: "This election schedule has expired" };
  }
  if (action === "pause" && election.status !== "active")
    return { disabled: true, reason: "Only an active election can be paused" };
  if (action === "end") {
    if (election.status !== "active" && election.status !== "paused")
      return { disabled: true, reason: "Start the election before ending it" };
    if (now < end)
      return { disabled: true, reason: "Wait until the selected end time" };
  }
  if (action === "publish") {
    if (election.status !== "ended")
      return { disabled: true, reason: "End the election before publishing" };
    if (election.published)
      return { disabled: true, reason: "Results are already published" };
  }
  return { disabled: false, reason: "" };
}

function localDateTimeValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
export function Candidates() {
  const { elections, refresh } = useAdminData();
  const configurableElections = elections.filter(
    (e) => e.status === "draft" && Date.now() < new Date(e.startTime).getTime(),
  );
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    const f = Object.fromEntries(new FormData(form));
    try {
      const electionId = Number(f.electionId);
      const { contract, send } = await votingContract();
      const before = await contract.getElection(electionId);
      const tx = await send(
        "addCandidate",
        electionId,
        f.name,
        f.party,
        f.description,
        f.photoUrl,
      );
      const receipt = await tx.wait();
      await api.post(`/elections/${electionId}/candidates`, {
        chainId: Number(before.candidateCount) + 1,
        name: f.name,
        party: f.party,
        description: f.description,
        photoUrl: f.photoUrl,
        txHash: receipt.hash,
      });
      form.reset();
      refresh();
    } catch (x: any) {
      setError(blockchainErrorMessage(x));
    } finally {
      setBusy(false);
    }
  }
  return (
    <DashboardLayout>
      <PageTitle
        title="Candidate management"
        subtitle="Candidate lists lock when the election begins."
      />
      <div className="mt-7 grid gap-7 xl:grid-cols-[.8fr_1.2fr]">
        <form onSubmit={add} className="card space-y-4">
          <h2 className="text-xl font-bold">Add candidate</h2>
          {error && <Alert>{error}</Alert>}
          {!configurableElections.length && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No configurable election is available. Create a new election with
              a start time at least 5 minutes in the future, then add candidates
              before that time.
            </div>
          )}
          <label className="label">
            Election
            <select className="input" name="electionId" required>
              <option value="">Select</option>
              {configurableElections.map((x) => (
                <option value={x.onChainId} key={x._id}>
                  {x.title} - starts {new Date(x.startTime).toLocaleString()}
                </option>
              ))}
            </select>
          </label>
          {[
            ["name", "Name"],
            ["party", "Party"],
            ["description", "Description"],
            ["photoUrl", "Photo URL"],
          ].map(([n, l]) => (
            <label className="label" key={n}>
              {l}
              <input
                className="input"
                name={n}
                required={n === "name" || n === "party"}
              />
            </label>
          ))}
          <button
            className="btn w-full justify-center bg-teal py-3 text-white"
            disabled={busy || !configurableElections.length}
          >
            {busy ? <Spinner /> : "Add on-chain candidate"}
          </button>
        </form>
        <div className="space-y-5">
          {elections.map((x) => (
            <div className="card" key={x._id}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold">{x.title}</h3>
                <Status value={statusFor(x)} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Starts {new Date(x.startTime).toLocaleString()} · {x.candidates.length} candidates
              </p>
              <div className="mt-4 divide-y">
                {x.candidates.map((c) => (
                  <div className="flex items-center gap-3 py-3" key={c.chainId}>
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-mint font-bold text-teal">
                      {c.chainId}
                    </span>
                    <div>
                      <b className="text-sm">{c.name}</b>
                      <p className="text-xs text-slate-500">{c.party}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
export function Voters() {
  const [voters, setVoters] = useState<any[]>([]);
  const { elections } = useAdminData();
  const [error, setError] = useState("");
  const load = () =>
    api.get("/admin/voters").then((x) => setVoters(x.data.voters));
  useEffect(() => {
    load();
  }, []);
  async function register(v: any, electionId: number) {
    try {
      const { data: payload } = await api.get(
        `/admin/voters/${v._id}/eligibility-payload`,
      );
      const { send } = await votingContract();
      await (
        await send(
          "registerEligibleVoter",
          electionId,
          payload.walletAddress,
          payload.voterIdHash,
        )
      ).wait();
      alert(`${v.fullName} registered for election #${electionId}`);
    } catch (x: any) {
      setError(blockchainErrorMessage(x));
    }
  }
  return (
    <DashboardLayout>
      <PageTitle
        title="Voter management"
        subtitle="Verified accounts and their one-to-one registered wallets."
      />
      {error && (
        <div className="mt-5">
          <Alert>{error}</Alert>
        </div>
      )}
      <div className="card mt-7 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="pb-3">Voter</th>
              <th>Email</th>
              <th>Wallet</th>
              <th>Status</th>
              <th>Register eligible</th>
            </tr>
          </thead>
          <tbody>
            {voters.map((v) => (
              <tr className="border-t" key={v._id}>
                <td className="py-4 font-semibold">{v.fullName}</td>
                <td>{v.email}</td>
                <td>{short(v.walletAddress)}</td>
                <td>
                  <span className="badge bg-emerald-100 text-emerald-700">
                    Verified
                  </span>
                </td>
                <td>
                  <select
                    className="rounded-lg border p-2"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) register(v, Number(e.target.value));
                    }}
                  >
                    <option value="">Choose election</option>
                    {elections.map((x) => (
                      <option value={x.onChainId} key={x._id}>
                        {x.title}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
export function Transactions() {
  const [data, setData] = useState<any[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    api
      .get("/admin/transactions")
      .then((x) => setData(x.data.transactions))
      .catch((x) => setError(blockchainErrorMessage(x)));
  }, []);
  return (
    <DashboardLayout>
      <PageTitle
        title="Blockchain transactions"
        subtitle="Recent events emitted by the configured voting contract."
      />
      {error && <Alert>{error}</Alert>}
      <div className="card mt-7 overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="pb-3">Event</th>
              <th>Transaction</th>
              <th>Block</th>
              <th>Contract</th>
            </tr>
          </thead>
          <tbody>
            {data.map((x, i) => (
              <tr className="border-t" key={i}>
                <td className="py-4 font-semibold">{x.event}</td>
                <td className="font-mono">{short(x.transactionHash)}</td>
                <td>{x.blockNumber}</td>
                <td className="font-mono">{short(x.contractAddress)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
export function Audit() {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    api.get("/elections/audit").then((x) => setData(x.data.logs));
  }, []);
  return (
    <DashboardLayout>
      <PageTitle
        title="Administrative audit log"
        subtitle="Accountable records for privileged API actions."
      />
      <div className="mt-7 space-y-3">
        {data.length ? (
          data.map((x) => (
            <div className="card flex items-start gap-4" key={x._id}>
              <div className="rounded-xl bg-mint p-3 text-teal">
                <FileClock size={20} />
              </div>
              <div>
                <b>{x.action.replaceAll("_", " ")}</b>
                <p className="mt-1 text-sm text-slate-500">
                  {x.actor?.fullName || "System"} ·{" "}
                  {new Date(x.createdAt).toLocaleString()} · {x.target}
                </p>
              </div>
            </div>
          ))
        ) : (
          <Empty
            title="No audit events"
            text="Privileged actions will appear here."
          />
        )}
      </div>
    </DashboardLayout>
  );
}
export function PublishResults() {
  const { elections } = useAdminData();
  return (
    <DashboardLayout>
      <PageTitle
        title="Result publication"
        subtitle="Publication succeeds only after every commitment is revealed."
      />
      <div className="mt-7 grid gap-5 md:grid-cols-2">
        {elections.map((e) => (
          <div className="card" key={e._id}>
            <Status value={statusFor(e)} />
            <h2 className="mt-3 text-lg font-bold">{e.title}</h2>
            <p className="mt-2 text-sm text-slate-500">
              Final counts are calculated exclusively by the smart contract.
            </p>
            <a
              className="btn mt-5 border border-slate-200"
              href={`/results/${e.onChainId}`}
            >
              View published results
            </a>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
