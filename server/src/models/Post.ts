import { DataTypes, Model, BelongsToGetAssociationMixin } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

/**
 * Пост ленты на главном экране. Посты с isFeatured выводятся отдельной
 * каруселью «Актуальное» — там та же карточка, только крупным фото.
 */
class Post extends Model {
  public id!: string;
  public authorId!: string;
  public title!: string;
  public text!: string;
  public image?: string;
  public likes!: number;
  public isFeatured!: boolean;
  public publishedAt!: Date;
  public createdAt!: Date;
  public updatedAt!: Date;

  public getAuthor!: BelongsToGetAssociationMixin<User>;
}

Post.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    authorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    text: {
      type: DataTypes.TEXT,
    },
    image: {
      type: DataTypes.STRING,
    },
    likes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    publishedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'posts',
    timestamps: true,
  }
);

Post.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

export default Post;
