const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DataSchema = new Schema(
  {
    user: String,
    password: String,
    group: Array,
    public_key: Buffer,
    private_key: Buffer
  },
  {timestamps: true}
);

module.exports = mongoose.model("Data", DataSchema);