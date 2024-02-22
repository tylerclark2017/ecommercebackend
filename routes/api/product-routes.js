const router = require('express').Router();
const { Product, Category, Tag, ProductTag } = require('../../models');

// The `/api/products` endpoint


// get all products
router.get('/', (req, res) => {
  // find all products
  // be sure to include its associated Category and Tag data
  Product.findAll(
    {
      attributes: ['id', 'product_name', 'price', 'stock'],
      include: [
        {
          model: Category,
          as: 'category'
        },
        {
          model: Tag,
          through: ProductTag,
          as: 'tag'
        }
      ]
    }
  )
    .then(dbProductData => res.json(dbProductData))
    .catch(err => {
      console.log(err);
      res.status(500).json(err);
    });
});

// get one product
router.get('/:id', async (req, res) => {
  try {
    const productData = await Product.findByPk(req.params.id, {
      include: [{ model: Category }, { model: Tag }],
      attributes: {
        include: [
          [
            // Use plain SQL to (ASK ABOUT WHAT IS NEEDED HERE)
            sequelize.literal(
              '(SELECT SUM(product) FROM productTag WHERE car.driver_id = driver.id)'
              // need to update this, ask about it!
            ),
            'totalMileage',
          ],
        ],
      },
    });

    if (!productData) {
      res.status(404).json({ message: 'No product found with that id!' });
      return;
    }

    res.status(200).json(driverData);
  } catch (err) {
    res.status(500).json(err);
  }
});

// create new product
router.post('/', (req, res) => {
  Product.create(req.body)
    .then((product) => {
      if (req.body.tagIds) {
        const productTagIdArr = req.body.tagIds.map((tag_id) => {
          return { product_id: product.id, tag_id: tag_id };
        });
        return ProductTag.bulkCreate(productTagIdArr);
      } else {
        res.send('You did not provide any tag IDs!');
      }
    })
    .then(() => {
      console.log(`Created product`);
      res.send({ message: 'Product created!' });
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json({ error: err });
    });
});

  /* req.body should look like this...
    {
      product_name: "Basketball",
      price: 200.00,
      stock: 3,
      tagIds: [1, 2, 3, 4]
    }
  */
 

// update product
router.put('/:id', (req, res) => {
  // update product data
  Product.update(req.body, {
    where: {
      id: req.params.id,
    },
  })
    .then((product) => {
      if (req.body.tagIds && req.body.tagIds.length) {

        ProductTag.findAll({
          where: { product_id: req.params.id }
        }).then((productTags) => {
          // create filtered list of new tag_ids
          const productTagIds = productTags.map(({ tag_id }) => tag_id);
          const newProductTags = req.body.tagIds
            .filter((tag_id) => !productTagIds.includes(tag_id))
            .map((tag_id) => {
              return {
                product_id: req.params.id,
                tag_id,
              };
            });

          // figure out which ones to remove
          const productTagsToRemove = productTags
            .filter(({ tag_id }) => !req.body.tagIds.includes(tag_id))
            .map(({ id }) => id);
          // run both actions
          return Promise.all([
            ProductTag.destroy({ where: { id: productTagsToRemove } }),
            ProductTag.bulkCreate(newProductTags),
          ]);
        });
      }

      return res.json(product);
    })
    .catch((err) => {
      // console.log(err);
      res.status(400).json(err);
    });
});

router.delete('/:id', (req, res) => {
  // Delete one product by its `id` value
  Product.destroy({
    where: {
      id: req.params.id
    }
  })
  .then(() => {
    res.json({ message: 'Successfully deleted product' });
  })
  .catch((err) => {
    console.error(err);
    res.status(500).json(err);
  });
});

module.exports = router;
