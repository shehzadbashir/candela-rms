const { prisma } = require('../server');

const auditLog = (action, entity) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      if (req.user) {
        prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action,
            entity,
            entityId: req.params.id || data.id,
            details: {
              method: req.method,
              path: req.path,
              body: req.body,
              response: data
            },
            ipAddress: req.ip
          }
        }).catch(console.error);
      }
      
      originalJson.call(this, data);
    };
    
    next();
  };
};

module.exports = { auditLog };