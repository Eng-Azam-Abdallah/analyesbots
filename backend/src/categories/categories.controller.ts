import { Controller, Get, Param, Post } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list() {
    return this.categories.listFamilies();
  }

  @Post('reclassify')
  reclassify() {
    return this.categories.reclassifyAll();
  }

  @Get(':slug')
  one(@Param('slug') slug: string) {
    return this.categories.getFamily(slug);
  }
}
