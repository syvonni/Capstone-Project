import {
  ApartmentOutlined,
  BankOutlined,
  BuildOutlined,
  CarOutlined,
  CoffeeOutlined,
  CustomerServiceOutlined,
  FieldTimeOutlined,
  GoldOutlined,
  HomeOutlined,
  InboxOutlined,
  ShopOutlined,
  ThunderboltOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { INDUSTRY_CATEGORIES_BY_TAX_CODE } from '@/shared/constants/industryCategories';

const ICONS_BY_NAME = {
  ApartmentOutlined,
  BankOutlined,
  BuildOutlined,
  CarOutlined,
  CoffeeOutlined,
  CustomerServiceOutlined,
  FieldTimeOutlined,
  GoldOutlined,
  HomeOutlined,
  InboxOutlined,
  ShopOutlined,
  ThunderboltOutlined,
  ToolOutlined,
};

export default function IndustryIcon({ taxCode, size = 24, style, ...rest }) {
  const category = INDUSTRY_CATEGORIES_BY_TAX_CODE[taxCode];
  const IconComponent = ICONS_BY_NAME[category?.icon] || BuildOutlined;
  return <IconComponent style={{ fontSize: size, ...style }} {...rest} />;
}
