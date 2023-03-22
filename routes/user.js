var express = require('express');
var router = express.Router();
const productHelpers = require('../helpers/product-helpers');
const userHelpers=require('../helpers/user-helpers')

const verifyLogin=(req,res,next)=>{
  if(req.session.loggedIn){
    next()
  }else{
    res.redirect('/login')
  }
}
/* GET home page. */
router.get('/', async function(req, res, next) {
   let user=req.session.user

   let cartCount=null
   if(user){
   cartCount=await userHelpers.getCartCount(user._id)
   }
  productHelpers.getAllProducts().then((products)=>{
     res.render('user/view-products',{admin:false,products,user,cartCount})
  })

});

router.get('/login',(req,res)=>{
  if(req.session.loggedIn){
    res.redirect('/')
  }
  else{
    res.render('user/login',{"loginErr":req.session.loginErr})
    req.session.loginErr=false
  }
  
})
router.get('/signup',(req,res)=>{
  res.render('user/signup')
  
})

router.post('/signup',(req,res)=>{
    userHelpers.doSignup(req.body).then((response)=>{
      console.log(response)
      req.session.loggedIn=true
      req.session.user=response
      res.redirect('/')
    })
})

router.post('/login',(req,res)=>{
  userHelpers.doLogin(req.body).then((response)=>{
    if(response.status){
      req.session.loggedIn=true
      req.session.user=response.user
      res.redirect('/')
    }else{
      req.session.loginErr=true
      res.redirect('/login')
    }
  })
})
router.get('/logout',(req,res)=>{
  req.session.destroy()
  res.redirect('/')
})

router.get('/cart',verifyLogin,async(req,res,next)=>{
  let user=req.session.user
  let products=await userHelpers.getCartProducts(user._id)
  let total=0;
  if(products.length>0){
    total=await userHelpers.getTotalAmount(user._id)
  }
  
  res.render('user/cart',{products,user,total})
})

router.get('/add-to-cart/:id',verifyLogin,(req,res)=>{
  console.log("api call")
  userHelpers.addToCart(req.params.id,req.session.user._id).then(()=>{
    res.json({status:true})
  })
})

router.post('/change-product-quantity',(req,res,next)=>{
  userHelpers.changeProductQuantity(req.body).then(async(response)=>{
  response.total=await userHelpers.getTotalAmount(req.body.userId)
          res.json(response)
  })
})

router.post('/remove-product',(req,res,next)=>{
  userHelpers.removeProduct(req.body).then((response)=>{
   res.json(response)
  })
})

router.get('/place-order',verifyLogin,async(req,res)=>{
  let user=req.session.user
  let total=await userHelpers.getTotalAmount(req.session.user._id)
 
  res.render('user/place-order',{total,user})
})

router.post('/place-order',async(req,res)=>{
console.log(req.body)
let products=await userHelpers.getCartProductList(req.body.userId)
let totalPrice=await userHelpers.getTotalAmount(req.body.userId)
userHelpers.placeOrder(req.body,products,totalPrice).then((response)=>{
   res.json({status:true})
})
})

router.get('/order-success',verifyLogin,(req,res)=>{
  user=req.session.user
  res.render('user/order-success',{user})
})

router.get('/orders',verifyLogin,async(req,res)=>{
  user=req.session.user._id
  let order=await userHelpers.getOrderDetails(user)
   res.render('user/orderList',{user,order})
})

router.get('/ViewOrderedProducts/:id',async(req,res)=>{
  user=req.session.user._id
  let products=await userHelpers.getOrderedProducts(req.params.id)
 res.render('user/ViewOrderedProducts',{products,user})
})

module.exports = router;
