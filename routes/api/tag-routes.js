const router = require('express').Router();
const { Tag, Product, ProductTag } = require('../../models');

// The `/api/tags` endpoint

router.get('/', async (req, res) => {
  // find all tags
  // be sure to include its associated Product data
  try {
    const tagData = await Tag.findAll({ include: [{ model: Product }] });
    res.status(200).json(tagData);
  }
  catch (err) {
    res.status(500).json(err);
  }
});

router.get('/:id', (req, res) => {
  // find a single tag by its `id`
  // be sure to include its associated Product data
  Tag.findOne({ where: { id: req.params.id }, include: [{ model: Product }] })
    .then((tag) => {
      if (!tag) {
        res.status(404).json({ message: 'No tag found with this id' });
        return;
      }
      res.json(tag);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

router.post('/', (req, res) => {
  // create a new tag
  Tag.create(req.body)
    .then((tag) => {
      // if there's product tags, we need to create pairings for them
      if (req.body.productIds) {
        const productTagIdArr = req.body.productIds.map((product_id) => {
          return {
            product_id,
            tag_id: tag.id,
          };
        });
        return ProductTag.bulkCreate(productTagIdArr);
      }
      res.status(200).json(tag);
    })
    .then((productTagIds) => {
      // serialize the data so that it's ready to go to JSON
      res.send(`Tag created! Also added ${productTagIds.length} products to the tag.`);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

router.put('/:id', (req, res) => {
  // update a tag's name by its `id` value
  Tag.update(req.body, {
    where: {
      id: req.params.id,
    },
  })
    .then((updatedTag) => {
      // find all associated tags from the product_tag table
      return Tag.findAll({ where: { id: req.params.id } });
    })
    .then(([tag]) => {
      // get the product ids from the request body
      const productTags = req.body.productIds;
      const tagProducts = tag.getProductTags();

      // figure out which ones to remove and add
      const productsToRemove = tagProducts.filter((ptag) => !productTags.includes(ptag.productId));
      const productsToAdd = productTags.filter((ptag) => !tagProducts.includes(ptag));

      // send back the updated tag
      res.status(200).json(tag);

      // run afterServers for each of the products being removed
      Sync.afterServer('delete', 'products', productsToRemove.map((ptag) => ptag.productId))
        .then(() => {
          // now that the products have been updated, update the tag's product association
          Tag.addProducts(tag.id, productsToAdd);
          Tag.removeProducts(tag.id, productsToRemove.map((ptag) => ptag.id));
        });
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json(err);
    });
});

router.delete('/:id', (req, res) => {
  // delete on tag by its `id` value
  Tag.destroy({
    where: { id: req.params.id }
  }).then((deleted) => {
    if (!deleted) {
      return res.status(404).json({ message: 'No tag found with this id!' });
    }
    res.status(200).json({ message: 'Tag has been deleted!' });
  })
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

module.exports = router;
