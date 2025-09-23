/**
 * Security validation module for Docker operations
 */

const SECURITY_CONFIG = {
    DANGEROUS_OPERATIONS: ['exec', 'attach', 'commit'],
    DANGEROUS_MOUNTS: ['/etc', '/proc', '/sys', '/dev', '/root', '/boot', '/usr', '/bin', '/sbin'],
};

const validateOperation = (operation, params = {}) => {
    try {
        console.log(`[SECURITY] Validating operation: ${operation}`);

        if (SECURITY_CONFIG.DANGEROUS_OPERATIONS.includes(operation)) {
            throw new Error(`Operation '${operation}' is blocked for security reasons.`);
        }
        
        if (operation === 'create') {
            validateContainerCreation(params);
        }

        console.log(`[SECURITY] ✅ Operation ${operation} validated`);
        return true;

    } catch (error) {
        console.error(`[SECURITY] ❌ Operation ${operation} blocked:`, error.message);
        throw error;
    }
};

const validateContainerCreation = (containerConfig) => {
    if (!containerConfig.HostConfig) return;

    const { HostConfig } = containerConfig;

    if (HostConfig.Privileged === true) {
        throw new Error('Privileged containers are not allowed for security reasons.');
    }

    if (HostConfig.Binds) {
        validateVolumeMounts(HostConfig.Binds);
    }

    if (HostConfig.CapAdd && HostConfig.CapAdd.includes('SYS_ADMIN')) {
        throw new Error('SYS_ADMIN capability is not allowed for security reasons.');
    }
};

const validateVolumeMounts = (binds) => {
    for (let bind of binds) {
        const hostPath = bind.split(':')[0];
        
        if (hostPath === '/var/run/docker.sock') {
            console.warn('[SECURITY] ⚠️ Docker socket mount detected');
            continue;
        }
        
        const isDangerous = SECURITY_CONFIG.DANGEROUS_MOUNTS.some(dangerous => 
            hostPath.startsWith(dangerous)
        );
        
        if (isDangerous) {
            throw new Error(`Mounting ${hostPath} is not allowed for security reasons.`);
        }
    }
};

module.exports = {
    validateOperation
};