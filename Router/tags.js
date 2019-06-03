var express = require('express')
var router = express.Router()
var mysql = require('mysql')

const con = mysql.createConnection({
	host : 'localhost',
	user : 'root',
	password : '',
	database : 'UCA_WebProject'
})
con.connect((err)=>{
	if (err) throw err
	console.log('connected...')
})

router.get('/',isAuthenticated(),(req,res)=>{
	con.query('select Image, Role, Name from Users',(err,result)=>{
		return res.render('Tags',{data: result[0]})
	})
})

router.post('/',isAuthenticated(),(req,res)=>{
	var data = ''
	req.on('data',(chunk)=>{
		data += chunk
	})
	req.on('end',()=>{
		con.query(`select * from tags where name = '${data}'`,(err,result)=>{
			if(err) throw err
			if(result.length==0){
				con.query(`select max(Id) as id from tags`,(err,result)=>{
					con.query(`insert into tags values(${result[0].id+1}, '${data}', '${req.user}', SYSDATE())`,(err,result)=>{
						if(err) throw err
						return res.send('added')
					})
				})
			}else{
				return res.send('exist')
			}
		})
	})
})
router.get('/tagslist',isAuthenticated(),(req,res)=>{
	con.query('select Image, Role, Name from Users',(err,result)=>{
		return res.render('taglist2',{data: result[0]})
	})
})

router.post('/tagslist',isAuthenticated(),(req,res)=>{
	var q = `select * from tags`;
	console.log(req.body)
	if(req.body.search.value){
		q = q + ` where instr(name,'${req.body. search.value}')`
	}
	// console.log(q)
	con.query(q,(err,result)=>{
		if (err) throw err
		var filtered = result.filter((value, index)=>{
    		return index>=req.body.start && req.body.length-->0
		})
		con.query(`select count(*) as Total from tags`,(err,total)=>{
			return res.json({'recordsTotal': total[0].Total, 'recordsFiltered' : result.length, data: filtered})
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