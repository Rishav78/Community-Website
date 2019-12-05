const communitylist = require('./communitylistService');
const communitypanel = require('./communitypanelServices');
const addcommunity = require('./addcommunityServices');
const managecommunity = require('./managecommunityService');
const communitymember = require('./communitymemberService');
const communityadmin = require('./communityadminServices');
const invitedusers = require('./inviteduserService');
const inviteusers = require('./inviteuserServices');
const invitelist = require('./invitelistServices');

module.exports = {
    communitylist,
    communitypanel,
    addcommunity,
    managecommunity,
    communitymember,
    communityadmin,
    invitedusers,
    inviteusers,
    invitelist,
}