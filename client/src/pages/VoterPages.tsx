import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  ShieldCheck,
  Users,
  Vote,
  WalletCards,
} from "lucide-react";
import { DashboardLayout, PublicLayout } from "../components/Layout";
import {
  Alert,
  Empty,
  Spinner,
  Status,
  statusFor,
  short,
} from "../components/UI";
import { api } from "../services/api";
import { blockchainErrorMessage, votingContract, wallet } from "../services/blockchain";
import { useAuth } from "../context/AuthContext";
import type { Election, Receipt } from "../types";
const useElections = () => {
  const [data, setData] = useState<Election[]>([]),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .get("/elections")
      .then((x) => setData(x.data.elections))
      .finally(() => setLoading(false));
  }, []);
  return { data, loading };
};
export function VoterDashboard() {
  const { user } = useAuth();
  const { data } = useElections();
  const active = data.filter((x) => statusFor(x) === "Active");
  return (
    <DashboardLayout>
      <PageTitle
        title={`Welcome back, ${user?.fullName.split(" ")[0]}`}
        subtitle="Your verified election workspace"
      />
      <div className="mt-7 grid gap-5 sm:grid-cols-3">
        {[
          [Vote, active.length, "Active elections"],
          [ShieldCheck, "Verified", "Identity status"],
          [WalletCards, short(user?.walletAddress), "Registered wallet"],
        ].map(([Icon, v, l]: any) => (
          <div className="card" key={l}>
            <Icon className="text-teal" />
            <p className="mt-5 text-2xl font-bold">{v}</p>
            <p className="mt-1 text-sm text-slate-500">{l}</p>
          </div>
        ))}
      </div>
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Ready for your vote</h2>
          <Link to="/elections" className="text-sm font-semibold text-teal">
            View all
          </Link>
        </div>
        {active.length ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {active.map((e) => (
              <ElectionCard key={e._id} e={e} />
            ))}
          </div>
        ) : (
          <Empty
            title="No active elections"
            text="Scheduled elections will appear here when voting opens."
          />
        )}
      </section>
    </DashboardLayout>
  );
}
export function ElectionList() {
  const { data, loading } = useElections();
  const [tab, setTab] = useState("Active");
  return (
    <DashboardLayout>
      <PageTitle
        title="Elections"
        subtitle="Review candidates and participate in elections you are eligible for."
      />
      <div className="mt-7 flex flex-wrap gap-2">
        {["Active", "Upcoming", "Awaiting start", "Paused", "Awaiting close", "Completed"].map((x) => (
          <button
            key={x}
            onClick={() => setTab(x)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === x ? "bg-ink text-white" : "bg-white text-slate-600"}`}
          >
            {x}
          </button>
        ))}
      </div>
      <div className="mt-5">
        {loading ? (
          <Spinner />
        ) : data.filter((x) => statusFor(x) === tab).length ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {data
              .filter((x) => statusFor(x) === tab)
              .map((e) => (
                <ElectionCard e={e} key={e._id} />
              ))}
          </div>
        ) : (
          <Empty
            title={`No ${tab.toLowerCase()} elections`}
            text="There is nothing in this category right now."
          />
        )}
      </div>
    </DashboardLayout>
  );
}
function ElectionCard({ e }: { e: Election }) {
  const s = statusFor(e);
  return (
    <article className="card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Status value={s} />
          <h3 className="mt-3 text-xl font-bold">{e.title}</h3>
        </div>
        <div className="rounded-xl bg-mint p-3 text-teal">
          <Vote />
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
        {e.description}
      </p>
      <div className="mt-5 flex flex-wrap gap-4 border-t pt-4 text-sm text-slate-500">
        <span className="flex gap-2">
          <CalendarDays size={17} />
          {new Date(e.startTime).toLocaleDateString()}
        </span>
        <span className="flex gap-2">
          <Users size={17} />
          {e.candidates.length} candidates
        </span>
      </div>
      <Link
        to={`/elections/${e.onChainId}`}
        className="btn mt-5 w-full justify-center border border-slate-200 hover:border-teal hover:text-teal"
      >
        {s === "Active" ? "Review and vote" : "View election"}
      </Link>
    </article>
  );
}
export function ElectionDetail() {
  const { id } = useParams();
  const [e, setE] = useState<Election>();
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .get(`/elections/${id}`)
      .then((x) => setE(x.data.election))
      .catch((x) => setError(blockchainErrorMessage(x)));
  }, [id]);
  if (!e)
    return (
      <DashboardLayout>
        {error ? <Alert>{error}</Alert> : <Spinner />}
      </DashboardLayout>
    );
  const s = statusFor(e);
  return (
    <DashboardLayout>
      <Link className="text-sm text-slate-500" to="/elections">
        ← Elections
      </Link>
      <div className="mt-5 rounded-3xl bg-ink p-7 text-white">
        <Status value={s} />
        <h1 className="mt-4 text-3xl font-bold">{e.title}</h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-300">
          {e.description}
        </p>
        <div className="mt-6 flex flex-wrap gap-5 text-sm text-slate-300">
          <span>Starts {new Date(e.startTime).toLocaleString()}</span>
          <span>Ends {new Date(e.endTime).toLocaleString()}</span>
        </div>
      </div>
      <h2 className="mt-8 text-xl font-bold">Candidates</h2>
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        {e.candidates.map((c) => (
          <div className="card flex gap-4" key={c.chainId}>
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-mint text-xl font-bold text-teal">
              {c.name
                .split(" ")
                .map((x) => x[0])
                .join("")}
            </div>
            <div>
              <h3 className="font-bold">{c.name}</h3>
              <p className="text-sm font-semibold text-teal">{c.party}</p>
              <p className="mt-2 text-sm text-slate-500">{c.description}</p>
            </div>
          </div>
        ))}
      </div>
      {s === "Active" && (
        <Link
          to={`/elections/${e.onChainId}/vote`}
          className="btn mt-7 bg-teal px-7 py-3 text-white"
        >
          Proceed to ballot
        </Link>
      )}
      {s === "Awaiting start" && (
        <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          The scheduled time has arrived, but the administrator has not started
          this election on the blockchain yet.
        </div>
      )}
      {s === "Paused" && (
        <div className="mt-7 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          Voting is temporarily paused by the administrator.
        </div>
      )}
      {s === "Awaiting close" && (
        <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Voting time has ended. The administrator must close the election on
          the blockchain before ballots can be revealed.
        </div>
      )}
      {s === "Completed" && (
        <Link
          to={`/results/${e.onChainId}`}
          className="btn mt-7 bg-ink px-7 py-3 text-white"
        >
          View published results
        </Link>
      )}
    </DashboardLayout>
  );
}
export function CastVote() {
  const { id } = useParams();
  const [e, setE] = useState<Election>();
  const [selected, setSelected] = useState<number>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  useEffect(() => {
    api.get(`/elections/${id}`).then((x) => setE(x.data.election));
  }, [id]);
  async function submit() {
    if (!selected || !e) return;
    setBusy(true);
    setError("");
    try {
      const w = await wallet();
      const { user } = await api.get("/auth/me").then((x) => x.data);
      if (w.address !== user.walletAddress.toLowerCase())
        throw new Error(
          "Connected wallet does not match your registered wallet",
        );
      const challenge = await api.post("/wallet/challenge").then((x) => x.data);
      const signature = await w.signer.signMessage(challenge.message);
      const prepared = await api
        .post("/votes/prepare", {
          electionId: e.onChainId,
          candidateId: selected,
          challengeId: challenge.challengeId,
          signature,
        })
        .then((x) => x.data);
      const { send } = await votingContract();
      const tx = await send("castVote", e.onChainId, prepared.commitment);
      const receipt = await tx.wait();
      const confirmed = await api
        .post("/votes/confirm", {
          ballotId: prepared.ballotId,
          txHash: receipt.hash,
        })
        .then((x) => x.data.receipt);
      sessionStorage.setItem("last_receipt", JSON.stringify(confirmed));
      nav(`/receipt/${confirmed.id}`);
    } catch (x: any) {
      setError(blockchainErrorMessage(x));
    } finally {
      setBusy(false);
    }
  }
  if (!e)
    return (
      <DashboardLayout>
        <Spinner />
      </DashboardLayout>
    );
  return (
    <DashboardLayout>
      <PageTitle
        title="Cast your vote"
        subtitle="Review carefully. A confirmed commitment cannot be replaced."
      />
      {error && (
        <div className="mt-5">
          <Alert>{error}</Alert>
        </div>
      )}
      <div className="mt-7 grid gap-4">
        {e.candidates.map((c) => (
          <button
            key={c.chainId}
            onClick={() => setSelected(c.chainId)}
            className={`flex items-center gap-4 rounded-2xl border bg-white p-5 text-left transition ${selected === c.chainId ? "border-teal ring-4 ring-teal/10" : "border-slate-200"}`}
          >
            <span
              className={`grid h-5 w-5 place-items-center rounded-full border ${selected === c.chainId ? "border-teal bg-teal" : "border-slate-300"}`}
            >
              {selected === c.chainId && (
                <CheckCircle2 size={15} className="text-white" />
              )}
            </span>
            <div>
              <b>{c.name}</b>
              <p className="text-sm text-teal">{c.party}</p>
            </div>
          </button>
        ))}
      </div>
      <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        MetaMask will ask you to sign an ownership challenge, then confirm the
        blockchain transaction. Keep your receipt so you can reveal the ballot
        after closing.
      </div>
      <button
        onClick={submit}
        disabled={!selected || busy}
        className="btn mt-5 justify-center bg-teal px-7 py-3 text-white disabled:opacity-50"
      >
        {busy ? (
          <>
            <Spinner />
            Waiting for MetaMask
          </>
        ) : (
          "Confirm and cast commitment"
        )}
      </button>
    </DashboardLayout>
  );
}
export function History() {
  const [items, setItems] = useState<Receipt[]>([]);
  useEffect(() => {
    api.get("/votes/mine").then((x) => setItems(x.data.ballots));
  }, []);
  return (
    <DashboardLayout>
      <PageTitle
        title="Voting history"
        subtitle="Receipts linked to your verified account."
      />
      <div className="mt-7 space-y-4">
        {items.length ? (
          items.map((r) => <ReceiptCard key={r.id} r={r} />)
        ) : (
          <Empty
            title="No voting history"
            text="Your confirmed ballot receipts will appear here."
          />
        )}
      </div>
    </DashboardLayout>
  );
}
export function ReceiptPage() {
  const { id } = useParams();
  const [items, setItems] = useState<Receipt[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .get("/votes/mine")
      .then((x) => setItems(x.data.ballots))
      .catch((x) => setError(blockchainErrorMessage(x)));
  }, []);
  const r =
    items.find((x) => x.id === id) ||
    (() => {
      try {
        return JSON.parse(sessionStorage.getItem("last_receipt") || "");
      } catch {
        return null;
      }
    })();
  return (
    <DashboardLayout>
      <PageTitle
        title="Voting receipt"
        subtitle="Your blockchain proof of inclusion."
      />
      {error && <Alert>{error}</Alert>}
      {r ? <ReceiptCard r={r} detailed /> : <Spinner />}
    </DashboardLayout>
  );
}
function ReceiptCard({
  r,
  detailed = false,
}: {
  r: Receipt;
  detailed?: boolean;
}) {
  const nav = useNavigate();
  const reveal = async () => {
    try {
      const p = await api.get(`/votes/${r.id}/reveal`).then((x) => x.data);
      const { send } = await votingContract();
      const tx = await send(
        "revealVote",
        p.electionId,
        p.candidateId,
        p.salt,
        p.voter,
      );
      const done = await tx.wait();
      await api.post(`/votes/${r.id}/reveal`, { txHash: done.hash });
      nav(`/results/${p.electionId}`);
    } catch (x: any) {
      alert(blockchainErrorMessage(x));
    }
  };
  const title =
    typeof r.election === "object" && r.election
      ? "title" in r.election
        ? r.election.title
        : "Election"
      : `Election #${r.electionId}`;
  return (
    <div className={`card ${detailed ? "mt-7 max-w-3xl" : ""}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <h3 className="mt-1 font-bold">Ballot commitment accepted</h3>
        </div>
        <Status value={r.status} />
      </div>
      <div className="mt-5 grid gap-4 border-t pt-5 sm:grid-cols-2">
        {[
          ["Transaction", r.transactionHash],
          ["Block", r.blockNumber],
          ["Wallet", r.walletAddress],
          ["Contract", r.contractAddress],
          [
            "Timestamp",
            r.timestamp ? new Date(r.timestamp).toLocaleString() : "Pending",
          ],
          ["Election ID", r.electionId],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {k}
            </p>
            <p className="mt-1 break-all text-sm font-medium">
              {String(v || "—")}
            </p>
          </div>
        ))}
      </div>
      {r.status === "confirmed" && (
        <button onClick={reveal} className="btn mt-5 bg-ink text-white">
          Reveal after election ends
        </button>
      )}
    </div>
  );
}
export function Verify() {
  const [hash, setHash] = useState("");
  const [data, setData] = useState<any>();
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setData(undefined);
    try {
      setData(await api.get(`/votes/verify/${hash}`).then((x) => x.data));
    } catch (x: any) {
      setError(blockchainErrorMessage(x));
    }
  }
  const body = (
    <main className="mx-auto max-w-4xl px-5 py-12">
      <PageTitle
        title="Verify a transaction"
        subtitle="Check a receipt directly against the configured Ethereum network."
      />
      <form
        onSubmit={submit}
        className="card mt-7 flex flex-col gap-3 sm:flex-row"
      >
        <input
          className="input !mt-0 flex-1"
          value={hash}
          onChange={(e) => setHash(e.target.value)}
          placeholder="0x transaction hash"
          pattern="0x[a-fA-F0-9]{64}"
          required
        />
        <button className="btn justify-center bg-teal px-6 text-white">
          Verify
        </button>
      </form>
      {error && (
        <div className="mt-5">
          <Alert>{error}</Alert>
        </div>
      )}
      {data && (
        <div className="card mt-5">
          <div className="flex items-center gap-3 text-emerald-700">
            <CheckCircle2 />
            <b>Transaction {data.status}</b>
          </div>
          <pre className="mt-5 overflow-auto rounded-xl bg-slate-950 p-4 text-sm text-slate-200">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </main>
  );
  return sessionStorage.getItem("sv_token") ? (
    <DashboardLayout>{body}</DashboardLayout>
  ) : (
    <PublicLayout>{body}</PublicLayout>
  );
}
export function Results() {
  const { id } = useParams();
  const [data, setData] = useState<any>();
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .get(`/elections/${id}/results`)
      .then((x) => setData(x.data))
      .catch((x) => setError(blockchainErrorMessage(x)));
  }, [id]);
  const body = (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <PageTitle
        title="Election results"
        subtitle="Counts are read from the smart contract and cannot be edited here."
      />
      {error && (
        <div className="mt-5">
          <Alert>{error}</Alert>
        </div>
      )}
      {data && (
        <div className="mt-7">
          <div className="card">
            <h2 className="text-2xl font-bold">{data.election}</h2>
            <p className="mt-2 text-slate-500">
              {data.totalVotes} revealed ballots · {data.totalEligible} eligible
              voters
            </p>
            <div className="mt-7 space-y-6">
              {data.candidates
                .sort((a: any, b: any) => b.votes - a.votes)
                .map((c: any, i: number) => (
                  <div key={c.id}>
                    <div className="mb-2 flex justify-between">
                      <div>
                        <b>{c.name}</b>
                        <span className="ml-2 text-sm text-slate-500">
                          {c.party}
                        </span>
                        {i === 0 && data.totalVotes > 0 && (
                          <span className="badge ml-2 bg-amber-100 text-amber-700">
                            Winner
                          </span>
                        )}
                      </div>
                      <b>
                        {c.votes} · {c.percentage}%
                      </b>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-teal"
                        style={{ width: `${c.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
  return sessionStorage.getItem("sv_token") ? (
    <DashboardLayout>{body}</DashboardLayout>
  ) : (
    <PublicLayout>{body}</PublicLayout>
  );
}
export function Profile() {
  const { user } = useAuth();
  const [connected, setConnected] = useState("");
  return (
    <DashboardLayout>
      <PageTitle
        title="Profile and wallet"
        subtitle="Your sensitive voter ID is never returned by the API."
      />
      <div className="card mt-7 max-w-2xl">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-mint text-2xl font-bold text-teal">
          {user?.fullName
            .split(" ")
            .map((x) => x[0])
            .join("")}
        </div>
        <dl className="mt-6 space-y-5">
          {[
            ["Name", user?.fullName],
            ["Email", user?.email],
            ["Registered wallet", user?.walletAddress],
            ["Connected now", connected || "Not connected"],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {k}
              </dt>
              <dd className="mt-1 break-all font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <button
          onClick={async () => setConnected((await wallet()).address)}
          className="btn mt-6 bg-ink text-white"
        >
          Connect MetaMask
        </button>
      </div>
    </DashboardLayout>
  );
}
export const PageTitle = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) => (
  <div>
    <h1 className="text-3xl font-bold">{title}</h1>
    <p className="mt-2 text-slate-500">{subtitle}</p>
  </div>
);
