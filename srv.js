const express=require('express')
const mysql= require('mysql2')
const path = require('path')//public directory에 있는 파일을 사용하기 위해 사용
const static = require('serve-static')//srv.js가 가장 최상위 경로로 인식 하기 위해 사용

const dbconfig = require(`./config/dbconfig.json`)//db정보 받아옴


//Database connection pool
const pool = mysql.createPool({
    connectionLimit: 10,//만들 연결 개수
    host:dbconfig.host,
    port:'3306',
    user:dbconfig.user,
    password: dbconfig.password,
    database: dbconfig.database,
    debug:false
})

const app = express()
app.use(express.urlencoded({extended:true}))//URL을 인코딩 확장할 수 있음
app.use(express.json())//json형태로 오는 것 확인 가능

app.use('/process/adduser', static(path.join(__dirname,`public`)));
//현재 디렉토리에/public 추가
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'adduser.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/process/adduser', async (req, res) => {
    console.log(`/process/adduser 호출됨${req}`);

    const paramId = req.body.id;
    const paramName = req.body.name;
    const paramAge = req.body.age;
    const paramPassword = req.body.password;

    try {
        const con = await pool.promise().getConnection();
        
        console.log('connect database');
        const result = await con.query('INSERT INTO users (id, username, age, password) VALUES (?, ?, ?, SHA2(?,256));',
            [paramId, paramName, paramAge, paramPassword]);

        con.release();

        console.dir(result);
        console.log(`insert success`);

        // 회원가입 성공 시 로그인 페이지로 리다이렉트
        res.redirect('/login');
    } catch (err) {
        console.error('sql run err');
        console.error(err);
        res.writeHead('500', {'Content-Type': 'text/html; charset=utf8'});
        res.write('<h2>SQL query 실행 실패</h2>');
        res.end();
    }
});


app.post('/process/login', (req,res)=>{
    console.log('/process/login req'+req);
    const paramId=req.body.id;
    const paramPassword=req.body.password;

    console.log(`로그인 요청${paramId,paramPassword}`);

    pool.getConnection((err,con)=>{
        con.release();
        if(err){
            console.log('sql run err');
            console.dir(err);
            res.writeHead('200',{'Content-Type':'text/html; charset=utf8'})
            res.write('<h2>sql quary 실행 실패</h2>')
            res.end();
            return;
        }

        const exec = con.query("select `id`, `username` from `users` where `id`=? and `password`= SHA2(?,256)",
            [paramId,paramPassword],
            (err,rows)=>{
                con.release();
                console.log('실행된 sql quary:'+exec.sql);
                
                if(err){
                    console.log('sql run err');
                    console.dir(err);
                    res.writeHead('200',{'Content-Type':'text/html; charset=utf8'})
                    res.write('<h2>sql quary 실행 실패</h2>')
                    res.end();
                    return;
                }

                if(rows.length>0){
                    console.log(`아이디[${paramId}]찾음`);
                    res.writeHead('200',{'Content-Type':'text/html; charset=utf8'})
                    res.write('<h2>login success</h2>')
                    res.end();
                    return;
                }
                else{
                    console.log(`아이디와 패스워드 일치 안함`);
                    res.writeHead('200',{'Content-Type':'text/html; charset=utf8'})
                    res.write('<h2>login faile</h2>')
                    res.end();
                    return;
                }
            }
        )
    });
});

app.listen(8000, ()=>{
    console.log('listen port 8000');
})

