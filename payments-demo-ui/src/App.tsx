import { useState, useEffect } from 'react';
import './App.css';
import FocusBank from './components/FocusBank';

const API_BASE = 'http://localhost:3001/api';

interface User {
  id: string;
  name: string;
  cardLast4: string;
  primaryPanMasked: string;
}

interface Stake {
  id: string;
  amountTotal: number;
  amountRefunded: number;
  status: string;
  createdAt: string;
}

interface Transfer {
  id: string;
  direction: string;
  amount: number;
  visaStatus: string | null;
  visaTransferId: string | null;
  createdAt: string;
}

interface Pool {
  amountTotal: number;
  lastSettlementAt: string | null;
}

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [stakes, setStakes] = useState<Stake[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [pool, setPool] = useState<Pool>({ amountTotal: 0, lastSettlementAt: null });
  const [loading, setLoading] = useState(false);
  const [activeStake, setActiveStake] = useState<Stake | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [newUserName, setNewUserName] = useState('');
  const [newUserCard, setNewUserCard] = useState('');
  const [stakeAmount, setStakeAmount] = useState('100');
  const [refundAmount, setRefundAmount] = useState('1');
  const [selectedStakeId, setSelectedStakeId] = useState('');

  useEffect(() => {
    loadUsers();
    loadPool();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadUserData(selectedUser.id);
    }
  }, [selectedUser]);

  const loadUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/users`);
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      const [stakesRes, transfersRes] = await Promise.all([
        fetch(`${API_BASE}/payments/stakes/${userId}`),
        fetch(`${API_BASE}/payments/transfers/${userId}`),
      ]);
      const stakesData = await stakesRes.json();
      const transfersData = await transfersRes.json();
      setStakes(stakesData);
      setTransfers(transfersData);
      
      // Find active stake
      const active = stakesData.find((s: Stake) => s.status === 'HELD');
      setActiveStake(active || null);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const loadPool = async () => {
    try {
      const res = await fetch(`${API_BASE}/payments/pool`);
      const data = await res.json();
      setPool(data);
    } catch (error) {
      console.error('Failed to load pool:', error);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newUserName, cardLast4: newUserCard }),
      });
      if (!res.ok) throw new Error('Failed to create user');
      const user = await res.json();
      showMessage('success', `User ${user.name} created!`);
      setNewUserName('');
      setNewUserCard('');
      loadUsers();
    } catch (error: any) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const createStake = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/payments/stake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          amount: parseFloat(stakeAmount),
          cardLast4: selectedUser.cardLast4,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create stake');
      }
      const data = await res.json();
      showMessage('success', `Stake created: $${data.amount} (ID: ${data.stakeId.slice(0, 8)}...)`);
      loadUserData(selectedUser.id);
    } catch (error: any) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const processRefund = async () => {
    if (!selectedUser || !activeStake) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/payments/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          stakeId: activeStake.id,
          amount: parseFloat(refundAmount),
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to process refund');
      }
      const data = await res.json();
      showMessage('success', `💰 Earned $${data.amount}! Bank cracked more. (TX: ${data.visaTransferId})`);
      loadUserData(selectedUser.id);
    } catch (error: any) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickEarn = async (amount: number) => {
    if (!selectedUser || !activeStake) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/payments/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          stakeId: activeStake.id,
          amount: amount,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to process refund');
      }
      const data = await res.json();
      showMessage('success', `💰 Earned $${data.amount}! Bank cracked more.`);
      
      // Play success sound (if you add audio)
      // new Audio('/ka-ching.mp3').play();
      
      loadUserData(selectedUser.id);
    } catch (error: any) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const settlePool = async () => {
    if (!activeStake) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/payments/settle-pool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stakeId: activeStake.id }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to settle pool');
      }
      const data = await res.json();
      showMessage('success', `Stake closed! $${data.amount} sent to community pool`);
      loadUserData(selectedUser!.id);
      loadPool();
    } catch (error: any) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">FlowSync X⁺</h1>
          <p className="text-xl text-purple-100">Visa Sandbox Payments Demo</p>
          <p className="text-sm text-purple-200 mt-2">Stake → Micro-Refund → Pool Settle</p>
        </div>

        {/* Message Toast */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            } text-white font-semibold shadow-lg`}
          >
            {message.text}
          </div>
        )}

        {/* Create User Form */}
        <div className="bg-white rounded-xl shadow-2xl p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Create Demo User</h2>
          <form onSubmit={createUser} className="flex gap-4">
            <input
              type="text"
              placeholder="Name"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
            <input
              type="text"
              placeholder="Last 4 digits"
              value={newUserCard}
              onChange={(e) => setNewUserCard(e.target.value)}
              className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              maxLength={4}
              pattern="[0-9]{4}"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-semibold"
            >
              Create User
            </button>
          </form>
        </div>

        {/* User Selection */}
        <div className="bg-white rounded-xl shadow-2xl p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Select User</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className={`p-4 rounded-lg border-2 transition ${
                  selectedUser?.id === user.id
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-300 hover:border-purple-400'
                }`}
              >
                <div className="font-semibold">{user.name}</div>
                <div className="text-sm text-gray-600">****{user.cardLast4}</div>
              </button>
            ))}
          </div>
        </div>

        {selectedUser && (
          <>
            {/* Focus Bank - Main Visual */}
            {activeStake && (
              <FocusBank
                total={activeStake.amountTotal}
                earned={activeStake.amountRefunded}
                available={activeStake.amountTotal - activeStake.amountRefunded}
                onEarn={handleQuickEarn}
                onSettle={settlePool}
                loading={loading}
              />
            )}

            {/* Simplified Controls */}
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              {/* Stake */}
              <div className="bg-white rounded-xl shadow-2xl p-6">
                <h3 className="text-xl font-bold mb-4">💰 Stake</h3>
                {activeStake ? (
                  <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-green-700 font-semibold mb-1">Active Stake</div>
                    <div className="text-2xl font-bold text-green-600">
                      ${(activeStake.amountTotal - activeStake.amountRefunded).toFixed(2)}
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      ${activeStake.amountRefunded.toFixed(2)} earned of ${activeStake.amountTotal.toFixed(2)}
                    </div>
                  </div>
                ) : (
                  <>
                    <input
                      type="number"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Amount"
                    />
                    <button
                      onClick={createStake}
                      disabled={loading}
                      className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold"
                    >
                      Stake ${stakeAmount}
                    </button>
                  </>
                )}
              </div>

              {/* Refund */}
              <div className="bg-white rounded-xl shadow-2xl p-6">
                <h3 className="text-xl font-bold mb-4">🎁 Earn FlowPoints</h3>
                {activeStake && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm text-gray-600">Available</div>
                    <div className="text-2xl font-bold text-blue-600">
                      ${(activeStake.amountTotal - activeStake.amountRefunded).toFixed(2)}
                    </div>
                  </div>
                )}
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Refund amount"
                />
                <button
                  onClick={processRefund}
                  disabled={loading || !activeStake}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
                >
                  Earn ${refundAmount}
                </button>
              </div>

              {/* Pool Settle */}
              <div className="bg-white rounded-xl shadow-2xl p-6">
                <h3 className="text-xl font-bold mb-4">✨ FlowPoints Remaining</h3>
                <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                  <div className="text-sm text-gray-600">Available to Settle</div>
                  <div className="text-2xl font-bold text-purple-600">
                    ${activeStake ? (activeStake.amountTotal - activeStake.amountRefunded).toFixed(2) : '0.00'}
                  </div>
                  {activeStake && (
                    <div className="text-xs text-gray-500 mt-1">
                      Earned: ${activeStake.amountRefunded.toFixed(2)} / ${activeStake.amountTotal.toFixed(2)}
                    </div>
                  )}
                </div>
                <button
                  onClick={settlePool}
                  disabled={loading || !activeStake}
                  className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-semibold"
                >
                  Settle & Close Stake
                </button>
                <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600 text-center">
                  Remaining funds go to community pool
                </div>
              </div>
            </div>

            {/* Stakes Table */}
            <div className="bg-white rounded-xl shadow-2xl p-6 mb-6">
              <h3 className="text-xl font-bold mb-4">📊 Stakes</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">ID</th>
                      <th className="text-left p-2">Total</th>
                      <th className="text-left p-2">Refunded</th>
                      <th className="text-left p-2">Available</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stakes.map((stake) => (
                      <tr key={stake.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-mono text-sm">{stake.id.slice(0, 8)}...</td>
                        <td className="p-2">${stake.amountTotal.toFixed(2)}</td>
                        <td className="p-2">${stake.amountRefunded.toFixed(2)}</td>
                        <td className="p-2 font-semibold">
                          ${(stake.amountTotal - stake.amountRefunded).toFixed(2)}
                        </td>
                        <td className="p-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              stake.status === 'HELD'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {stake.status}
                          </span>
                        </td>
                        <td className="p-2 text-sm text-gray-600">
                          {new Date(stake.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Transfers Table */}
            <div className="bg-white rounded-xl shadow-2xl p-6">
              <h3 className="text-xl font-bold mb-4">💸 Transfers</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">ID</th>
                      <th className="text-left p-2">Direction</th>
                      <th className="text-left p-2">Amount</th>
                      <th className="text-left p-2">Visa Status</th>
                      <th className="text-left p-2">Visa Transfer ID</th>
                      <th className="text-left p-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.map((transfer) => (
                      <tr key={transfer.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-mono text-sm">{transfer.id.slice(0, 8)}...</td>
                        <td className="p-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              transfer.direction === 'PUSH'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {transfer.direction}
                          </span>
                        </td>
                        <td className="p-2 font-semibold">${transfer.amount.toFixed(2)}</td>
                        <td className="p-2 text-sm">{transfer.visaStatus || 'N/A'}</td>
                        <td className="p-2 font-mono text-xs text-gray-600">
                          {transfer.visaTransferId || 'N/A'}
                        </td>
                        <td className="p-2 text-sm text-gray-600">
                          {new Date(transfer.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;

