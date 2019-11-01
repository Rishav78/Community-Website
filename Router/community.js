var express = require('express')
var router = express.Router()
const user = require('../models/user');
const community = require('../models/community');
var path = require('path')
var multer = require('multer')
var striptags = require('striptags')
const communitymembers = require('../models/communityMember');
const mongoose = require('../models/db');

const storage = multer.diskStorage({
	destination: './Public/Files',
	filename: function(req, file, cb){
		con.query(`update Users set Image = '${req.user + path.extname(file.originalname)}' where Id = '${req.user}'`)
		cb(null, req.user + path.extname(file.originalname))
	}
})

const upload = multer({
	storage: storage,
}).single('file');

router.post('/updateProfilePic',(req,res)=>{
	upload(req,res,err=>{
		if(err) throw err;
		res.redirect('/profile')
	})
})

router.get('/communityList',isAuthenticated(),(req,res)=>{
	user
	.findById(req.user._id)
	.then((result)=>{
		return res.render('CommunityList',{
			data: result
		})
	})
})

router.post('/communityList',isAuthenticated(),(req,res)=>{
	const array = ['CommunityName', 'MembershipRule', 'CommunityLocation', 'CommunityOwner', 'CreateDate'];
	const query = {};
	if(req.body.MembershipRule != 'All')
		query.MembershipRule = req.body.MembershipRule;
	if(req.body.search.value)
		query.CommunityName = {$regex: new RegExp(req.body.search.value)};
	community
	.find(query)
	.populate('CommunityOwner')
	.sort({[array[req.body.order[0].column]]: req.body.order[0].dir})
	.then((result)=>{
		var record = result.filter((value,index)=>{
			if(index >= req.body.start && req.body.length>0){
				req.body.length--
				return true;
			}
		})
		community
		.countDocuments({})
		.then((count)=>{
			res.send({'recordsTotal': count, 'recordsFiltered' : result.length, data: record});
		})
	})
})

router.post('/updateCommunity/:id',(req,res)=>{
	knex('communityList')
	.where('Id', req.params.id)
	.update({
		CommunityName: req.body.CommunityName,
		Status: req.body.Status,
	})
	.then(()=>{
		res.send('done')
	})
})

router.get('/getCommunity/:id',(req,res)=>{
	knex.table('communityList')
	.innerJoin('Users','communityList.CommunityOwner','=','Users.Id')
	.where('communityList.Id', req.params.id)
	.then((result)=>{
		res.json(result[0])
	})
})

router.get('/communitypanel',isAuthenticated(),(req,res)=>{
	communitymembers
	.find({
		'_id': req.user._id,
		'Accepted': true,
	})
	.populate('UserId')
	.then((community)=>{
		return res.render('communityPanel',{
			data: req.user,
			community: community
		})
	})
})

router.get('/AddCommunity',isAuthenticated(),(req,res)=>{
	res.render('CreateCommunity',{
		created: false,
		data: req.user
	})
})

router.post('/AddCommunity/create',isAuthenticated(),(req,res)=>{
	
	var id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
	const newCommunity = new community({
		CommunityName:req.body.CommunityName,
		MembershipRule:req.body.MembershipRule,
		CommunityLocation:'Not Added',
		CommunityOwner:req.user,
		Discription:req.body.Discription.replace(/<[^>]*>/g, ''),
		TotalReq:0,
		Members:0,
		User:0,
		Invited:0,
		CommunityPic:'defaultCommunity.jpg',
		Status:'Activate',
	});
	newCommunity.save((err) => {
		if(err) throw err;
		const newcommunitymember = new communitymembers({
			communityId: newCommunity._id,
			UserId: req.user._id,
			Accepted: 'True',
			Type: 'Owner',
		});
		newcommunitymember.save(() => {
			res.render('CreateCommunity',{
				created: true, 
				data: req.user
			})
		})
	})
})

router.post('/updateProfilePic',isAuthenticated(),(req,res)=>{
	upload(req,res,err=>{
		if(err) throw err;
		res.redirect('/profile')
	})
})

router.get('/manageCommunity/:id',isAuthenticated(),(req,res)=>{
	knex('Users')
	.where('Id', req.user)
	.then((user)=>{
		knex('communityList')
		.where('Id', req.params.id)
		.then((community)=>{
			if(community[0].Status=='Activate'){
				return res.render('manageCommunity',{
					data: user[0], 
					community: community[0], 
					join: true,
					request: false
				})
			}else{
				return res.render('404NotFound',{msg: 'Error: This community is deactivated or may be deleted by superadmin'})
			}
		})
	})
})

router.post('/manageCommunity/:id',isAuthenticated(),(req,res)=>{
	knex('communityList')
	.where('Id', req.params.id)
	.then((result)=>{
		res.json(result)
	})
})

router.post('/promot/:id',isAuthenticated(),(req,res)=>{
	knex('communityMembers')
	.where('UserId', req.params.id)
	.andWhere('Id', req.body.communityId)
	.update({
		Type: 'Admin'
	})
	.then(()=>{
		knex('communityList')
		.where('Id', req.body.communityId)
		.update({
			User: knex.raw('User - 1')
		})
		.then(()=>{
			res.send('done')
		})
	})
})

router.get('/CommunityMembers/:id',isAuthenticated(),(req,res)=>{
	knex.table('CommunityMembers').innerJoin('Users', function(){
		this.on('CommunityMembers.UserId', '=', 'users.Id')
	})
	.where('CommunityMembers.Id', '=', req.params.id)
	.andWhere('CommunityMembers.Accepted', '=', 'True')
	.andWhere('CommunityMembers.Type', '=', 'User')
	.then((result)=>{
		res.json(result)
	})
})

router.get('/CommunitysAdmins/:id',isAuthenticated(),(req,res)=>{
	knex.table('CommunityMembers')
	.innerJoin('Users', function(){
		this.on('CommunityMembers.UserId', '=', 'users.Id')
	})
	.where('CommunityMembers.Id', '=', req.params.id)
	.andWhere('CommunityMembers.Accepted', '=', 'True')
	.andWhere('CommunityMembers.Type', '!=', 'User')
	.then((result)=>{
		res.json(result)
	})
})

router.post('/Demote/:id',isAuthenticated(),(req,res)=>{
	knex('communityMembers')
	.where('UserId', req.params.id)
	.andWhere('Id', req.body.communityId)
	.update({
		Type: 'User'
	})
	.then((result)=>{
		knex('communityList')
		.where('Id', req.body.communityId)
		.update({
			User: knex.raw('User + 1')
		})
		.then(()=>{
			res.send('done')
		})
	})
})

router.post('/delete/:id',isAuthenticated(),(req,res)=>{
	knex('communityMembers')
	.where('User', req.body.user)
	.andWhere('Id', req.params.id)
	.del()
	.then(()=>{
		knex('communityList')
		.where('Id', req.params.id)
		.update({
			Members: knex.raw('Members - 1')
		})
		.then(()=>{
			if(req.body.Type == 'User'){
				knex('communityList')
				.where('Id', req.params.id)
				.update({
					User: knex.raw('User - 1')
				})
				.then(()=>{
					res.send('done')
				})
			}else {
				res.send('done');
			}
		})
	})

})

router.get('/list',isAuthenticated(),(req,res)=>{
	res.render('joinCommunity',{
		data: req.user
	})
})

router.post('/list',isAuthenticated(),(req,res)=>{
	communitymembers
	.find({UserId: req.user._id}, {communityId: 1})
	.then((communitys) => {
		communitys = communitys.map(value => mongoose.Types.ObjectId(value));
		if(req.body.search)
			query.CommunityName = new RegExp(req.body.search);
		community.find({$and: [
			{'_id': {'$nin': communitys}},
			{'CommunityName': new RegExp(req.body.search)},
			{'Status': 'Activate'}
		]})
		.then((result) => {
			return res.json(result)
		})
	})
})

router.get('/joinCommunity/:id',isAuthenticated(),(req,res)=>{
	community
	.findById(req.params.id,{MembershipRule: 1})
	.then((result)=>{
		if(result.MembershipRule == 'Direct'){
			knex('CommunityMembers')
			.insert({
				Id: req.params.id,
				UserId: req.user,
				Accepted: 'True',
				Type: 'User'
			})
			.then(()=>{
				knex('communityList')
				.where('Id', req.params.id)
				.update({
					Members: knex.raw('Members + 1'),
					User: knex.raw('User + 1'),
				})
			})
		}else{
			knex('CommunityMembers')
			.insert({
				Id: req.params.id,
				UserId: req.user,
				Accepted: 'False',
				Type: 'User'
			})
			.then(()=>{
				knex('communityList')
				.where('Id', req.params.id)
				.update({
					TotalReq: knex.raw('TotalReq + 1'),
				})
			})
		}
		res.redirect(`/community/communityProfile/${req.params.id}`);
	})
})

router.get('/communitymembers/:id',isAuthenticated(),(req,res)=>{
	console.log(req.params.id)
	knex('communityList')
	.where('Id', req.params.id)
	.then((community)=>{
		knex.table('Users')
		.innerJoin('CommunityMembers', 'users.Id', '=', 'communityMembers.UserId')
		.where('communityMembers.Id', req.params.id)
		.then((members)=>{
			res.render('communityMembers',{
				data: user[0], 
				community: community[0],
				members: members, 
				join: true,
				request: false
			})
		})
	})
})

router.get('/invite/:id',isAuthenticated(),(req,res)=>{
	knex('Users')
	.where('Id', req.user)
	.then((user)=>{
		knex('communityList')
		.where('Id', req.params.id)
		.then((community)=>{
			res.render('inviteUsers',{
				data: user[0],
				community: community[0],
			 	join: true,
				request: false
			})
		})
	})
})

router.post('/inviteUserList/:id',isAuthenticated(),(req,res)=>{
	knex('Users')
	.where(function(){
		this.whereNotIn('Id', function(){
			this.select('UserId')
			.from('communityMembers')
			.where('Id', req.params.id)
		})
	})
	.andWhere(function(){
		this.whereNotIn('Id', function(){
			this.select('UserId')
			.from('InvitedUsers')
			.where('Id', req.params.id)
		})
	})
	.andWhere(knex.raw(`INSTR(Name, '${req.body.search}')`))
	.then((result)=>{
		res.json(result)
	})
})

router.post('/invite/:id',isAuthenticated(),(req,res)=>{
	knex('invitedUsers')
	.insert({
		Id: req.params.id,
		UserId: req.body.id
	})
	.then(()=>{
		knex('communityList')
		.where('Id', req.params.id)
		.update({
			Invited: knex.raw('Invited + 1')
		})
		.then(()=>{
			res.send('done')
		})
	})
})

router.get('/communityProfile/:id',isAuthenticated(),(req,res)=>{
	knex('User')
	.where('Id', req.user)
	.then((user)=>{
		knex('communityList')
		.where('Id', req.params.id)
		.then((community)=>{
			knex.table('communityMembers')
			.innerJoin('Users','communityMembers.UserId', '=', 'Users.Id')
			.where('communityMembers.Id', req.params.id)
			.then((joined)=>{
				var requested
				var join = joined.filter((value)=>{
					return value.UserId == req.user
				})
				if(join[0]){
					requested = join[0].Accepted == 'False'
				}
				join = join.length > 0 && join[0].Accepted == 'True'
				var owner = joined.filter((value) => {
					return (value.UserId == req.user) && (value.Type == 'Owner')
				})
				res.render('CommunityProfile',
				{
					data: user[0], 
					community: community[0], 
					join: join, 
					request :requested,
					members: joined,
					owner: owner
				})
			})
		})
	})	
})

router.get('/leaveCommunity/:id',isAuthenticated(),(req,res)=>{
	knex('communityMembers')
	.where('Id', req.params.id)
	.andWhere('UserId', req.user)
	.then((member)=>{
		knex('communityMembers')
		.where('Id', req.params.id)
		.andWhere('UserId', req.user)
		.del()
		.then((result)=>{
			knex('communityList')
			.where('Id', req.params.id)
			.update({
				Members: knex.raw('Members - 1'),
				User: member[0].Type == 'User' ? knex.raw('User - 1') : knex.raw('User')
			})
			.then((result)=>{
				res.redirect(`/community/communityProfile/${req.params.id}`)
			})
		})
	})
})

router.get('/requests/:id',isAuthenticated(),(req,res)=>{
	knex.table('communityMembers')
	.innerJoin('Users','communityMembers.UserId', '=','Users.Id')
	.where('communityMembers.Id', req.params.id)
	andWhere('Accepted', 'False')
	.then((request)=>{
		res.json(request)
	})
})

router.get('/invitedUsers/:id',isAuthenticated(),(req,res)=>{
	knex.table('invitedUsers').innerJoin('Users', 'invitedUsers.UserId', '=', 'Users.Id')
	.where('invitedUsers.Id', req.params.id)
	.then((request)=>{
		res.json(request)
	})
})

router.post('/deleteInvite/:id',isAuthenticated(),(req,res)=>{
	knex('invitedUsers')
	.where('Id', req.params.id)
	.andWhere('UserId', req.body.user)
	.del()
	.then(()=>{
		knex('communityList')
		.where('Id', req.params.id)
		.update({
			invited: knex.raw('invited - 1')
		})
		.then(()=>{
			res.send('done')
		})
	})
})

router.get('/editCommunity/:id',isAuthenticated(),(req,res)=>{
	knex('Users')
	.where('Id', req.user)
	.then((user)=>{
		knex('communityList')
		.where('Id', req.params.id)
		.then((community)=>{
			res.render('editCommunity',{
				data: user[0], 
				community: community[0], 
				join: true,
				request: false,
			})
		})
	})	
})

router.post('/editCommunity/:id',isAuthenticated(),(req,res)=>{
	knex('communityList')
	.where('Id', req.params.id)
	.update({
		CommunityName: req.body.CommunityName,
		MembershipRule: req.body.MembershipRule,
		Discription: req.body.Discription.replace(/<[^>]*>/g, '')
	})
	.then(()=>{
		res.redirect(`/community/communityprofile/${req.params.id}`)
	})
})

router.post('/acceptReq/:id',isAuthenticated(),(req,res)=>{
	knex('communityMembers')
	.where('Id', req.params.id)
	.andWhere('UserId', req.body.user)
	.update({
		Accepted: 'True'
	})
	.then(()=>{
		knex('communityList')
		.where('Id', req.params.id)
		.update({
			TotalReq: knex.raw('TotalReq - 1'),
			members: knex.raw('members + 1')
		})
		.then(()=>{
			res.send('done')
		})
	})
})

router.get('/discussion/:id',(req,res)=>{
	knex('Users')
	.where('Id', req.user)
	.then((user)=>{
		knex('communityList')
		.where('Id', req.params.id)
		.then((community)=>{
			knex.select('name')
			.from('tags')
			.then((tags)=>{
				res.render('Discussion',{
					data: user[0], 
					community: community[0], 
					visible: true, 
					join:true, 
					request: false,
					tags
				})
			})
		})
	})
})


function isAuthenticated(){
	return (req, res, next)=>{
		if(req.isAuthenticated()){
			return next()
		}
		return res.redirect('/')
	}
}

module.exports = router;