# FSM Patterns for IT Simulator Subsystems

## Common Pattern: Pure-Function FSM
```typescript
type Event = { type: string; payload?: any };
type Transition<S> = (state: S, event: Event) => S;
```

### Services Subsystem
- **States**: `Stopped`, `Running`, `Paused`, `StartPending`, `StopPending`
- **Events**: `Start`, `Stop`, `Pause`, `Continue`, `ConfigChange`
- **Persistence**: Snapshot (service list + status) every 30s
- **Key invariant**: `isRunning || isPaused || isPending` is always true

### Registry Subsystem
- **States**: `Clean`, `Dirty` (per-key)
- **Events**: `SetValue`, `DeleteKey`, `CreateKey`, `RenameKey`
- **Persistence**: Full hive dump every 30s
- **Key invariant**: `dirty_count <= max_dirty_keys`

### Event Log Subsystem
- **States**: `Idle`, `Writing`, `Full`
- **Events**: `LogEvent`, `ClearLog`, `Archive`
- **Persistence**: Circular buffer (max 10k entries) + periodic flush
- **Key invariant**: `total_entries <= max_entries`

### Network Stack Subsystem
- **States**: `Up`, `Down`, `Degraded` (per-adapter)
- **Events**: `EnableAdapter`, `DisableAdapter`, `IpConfigChange`, `DnsChange`, `FirewallRuleAdd/Del`
- **Persistence**: Adapter config + ARP cache snapshot
- **Key invariant**: `adapter_count <= max_adapters`

### Active Directory Subsystem
- **States**: `DomainController`, `MemberServer`, `Workstation`
- **Events**: `CreateUser`, `DeleteUser`, `ModifyAttr`, `GroupAdd`, `Replicate`
- **Persistence**: LDIF export every 60s
- **Key invariant**: `user_count <= max_users`

### Filesystem Subsystem
- **States**: `Mounted`, `Unmounted`, `Corrupt` (per-volume)
- **Events**: `CreateFile`, `DeleteFile`, `Write`, `SetAcl`, `Mount`, `Unmount`
- **Persistence**: In-memory VFS tree + journal; checkpoint every 45s
- **Key invariant**: `mounted_count <= max_mounts`

## Common Patterns

### State Synchronization
- **Delta events**: Only mutated objects are broadcast
- **Delta format**: `{ subsystem, path, op: "set"|"delete", value? }`
- **Delta frequency**: Every session event or 30s timeout

### State Isolation
- **Namespace prefix**: All keys prefixed with `sid:` (session ID)
- **Namespace isolation**: `sid:` prefixed keys never overlap between sessions
- **Namespace enforcement**: Command validation enforces `sid:` prefix

### State Persistence
- **MessagePack snapshots**: ~2MB per snapshot, every 30s
- **JSONL WAL**: Append-only journal of all commands + state deltas
- **Recovery**: Load latest snapshot + replay WAL tail
- **Snapshot frequency**: 30s + on graceful shutdown

## Common Patterns for IT Simulator

### Subsystem Lifecycle
1. **Initial state**: All subsystems in quiescent state
2. **Command-driven**: Commands mutate state via pure functions
3. **Delta broadcast**: State deltas broadcast via WebSocket
4. **State persistence**: Periodic snapshots + WAL recovery

### State Validation
- **Pre-condition checks**: Validate command can be executed in current state
- **Post-condition checks**: Verify state invariants after mutation
- **Delta verification**: Verify delta matches expected changes

### Common Pitfalls
1. **Non-deterministic RNG**: Use seeded RNG per session
2. **Integer overflow**: Use bounded types for counters
3. **Stale state**: Always read fresh state from engine, not cached values
4. **Concurrent mutations**: Engine serializes all command execution