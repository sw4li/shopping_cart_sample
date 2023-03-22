var express = require('express');
const productHelpers = require('../helpers/product-helpers');
var router = express.Router();
var productHelper=require('../helpers/product-helpers')

/* GET users listing. */
router.get('/', function(req, res, next) {
   
   productHelpers.getAllProducts().then((products)=>{
    
     res.render('admin/view-products',{admin:true,products})
  })
 
});

router.get('/add-product',(req,res)=>{
   res.render('admin/add-product',{admin:true})
})
router.post('/add-product',(req,res)=>{
  productHelpers.addProduct(req.body,(insertedId)=>{
    let image=req.files.Image
    const imageName=insertedId
    console.log(insertedId)

    image.mv('./public/product-images/'+imageName+'.jpg',(err,done)=>{
      if(!err){
        res.render("admin/add-product",{admin:true})
      }else{
        console.log(err)
      }
    })
    
  })
})

router.get('/products',(req,res)=>{
  productHelpers.getAllProducts().then((products)=>{
  res.render('admin/view-products',{admin:true,products})
})
})

router.get('/delete-product/:pid',(req,res)=>{
        let proId=req.params.pid
        
        productHelpers.deleteProduct(proId).then((response)=>{
          res.redirect('/admin')
        })
})

router.get('/edit-product/:id',async(req,res)=>{
  let product=await productHelpers.getProductDetails(req.params.id)
  console.log(product)
  res.render('admin/edit-product',{product,admin:true})
})

router.post('/edit-product/:id',(req,res)=>{
  productHelpers.updateProduct(req.params.id,req.body).then(()=>{
    res.redirect('/admin')
    if(req.files.Image){
      let image=req.files.Image
      const imid=req.params.id
      image.mv('./public/product-images/'+imid+'.jpg')
    }
  })
})

module.exports = router;
