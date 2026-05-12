import { createLogger } from '@aasop/observability';

const logger = createLogger('sandbox-security');

export interface SecurityProfile {
  name: string;
  seccompProfile?: string;
  appArmorProfile?: string;
  capabilities?: {
    drop: string[];
    add?: string[];
  };
  readOnlyRootfs?: boolean;
  noNewPrivileges?: boolean;
  user?: string;
  group?: string;
  networkMode?: 'none' | 'bridge' | 'host';
  allowedHosts?: string[];
  blockedPaths?: string[];
  maxProcesses?: number;
}

const DEFAULT_SECCOMP = JSON.stringify({
  defaultAction: 'SCMP_ACT_ERRNO',
  defaultErrnoRet: 1,
  archMap: [
    { architecture: 'SCMP_ARCH_X86_64', subArchitectures: ['SCMP_ARCH_X86', 'SCMP_ARCH_X32'] },
    { architecture: 'SCMP_ARCH_AARCH64', subArchitectures: ['SCMP_ARCH_ARM'] },
  ],
  syscalls: [
    {
      names: [
        'accept', 'accept4', 'bind', 'clone', 'clone3', 'close', 'connect', 'epoll_create',
        'epoll_create1', 'epoll_ctl', 'epoll_pwait', 'epoll_wait', 'eventfd2', 'exit',
        'exit_group', 'fcntl', 'fstat', 'fstatfs', 'futex', 'getcwd', 'getdents64', 'getegid',
        'geteuid', 'getgid', 'getpgrp', 'getpid', 'getppid', 'getrandom', 'getrlimit',
        'getsockname', 'getsockopt', 'getuid', 'ioctl', 'kill', 'listen', 'lseek', 'madvise',
        'mmap', 'mprotect', 'munmap', 'nanosleep', 'open', 'openat', 'pipe2', 'poll', 'pread64',
        'prlimit64', 'pselect6', 'read', 'readv', 'recvfrom', 'recvmsg', 'rt_sigaction',
        'rt_sigprocmask', 'rt_sigreturn', 'sched_getaffinity', 'sched_yield', 'sendmsg',
        'sendto', 'set_robust_list', 'setitimer', 'setsockopt', 'sigaltstack', 'socket',
        'socketpair', 'splice', 'stat', 'statfs', 'sysinfo', 'tee', 'tgkill', 'uname',
        'wait4', 'waitid', 'write', 'writev',
      ],
      action: 'SCMP_ACT_ALLOW',
    },
  ],
});

export class SecurityProfiles {
  static default(): SecurityProfile {
    return {
      name: 'default',
      seccompProfile: DEFAULT_SECCOMP,
      readOnlyRootfs: true,
      noNewPrivileges: true,
      capabilities: {
        drop: ['ALL'],
      },
      networkMode: 'none',
      maxProcesses: 100,
    };
  }

  static unrestricted(): SecurityProfile {
    return {
      name: 'unrestricted',
      networkMode: 'bridge',
      readOnlyRootfs: false,
      noNewPrivileges: false,
    };
  }

  static networkOnly(): SecurityProfile {
    return {
      name: 'network-only',
      seccompProfile: DEFAULT_SECCOMP,
      readOnlyRootfs: true,
      noNewPrivileges: true,
      networkMode: 'bridge',
      allowedHosts: ['registry.npmjs.org', 'pypi.org', 'rubygems.org'],
      maxProcesses: 50,
      capabilities: {
        drop: ['ALL'],
        add: ['NET_BIND_SERVICE'],
      },
    };
  }

  static gpu(): SecurityProfile {
    return {
      name: 'gpu',
      seccompProfile: DEFAULT_SECCOMP,
      readOnlyRootfs: true,
      noNewPrivileges: true,
      networkMode: 'none',
      maxProcesses: 200,
      capabilities: {
        drop: ['ALL'],
        add: ['SYS_ADMIN'],
      },
    };
  }

  static fromSpec(spec: Partial<SecurityProfile>): SecurityProfile {
    const base = SecurityProfiles.default();
    return { ...base, ...spec };
  }

  static validate(profile: SecurityProfile): string[] {
    const errors: string[] = [];

    if (profile.maxProcesses && profile.maxProcesses > 10000) {
      errors.push('maxProcesses cannot exceed 10000');
    }

    if (profile.networkMode === 'host' && profile.name !== 'unrestricted') {
      logger.warn({ profile: profile.name }, 'Host network mode is insecure');
    }

    if (!profile.readOnlyRootfs && profile.name !== 'unrestricted') {
      errors.push('readOnlyRootfs must be true for non-unrestricted profiles');
    }

    return errors;
  }
}
