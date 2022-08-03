import { ref, Ref, computed, unref, ComputedRef } from "vue";
import { Product, PropertyGroup } from "@shopware-pwa/types";
import { ProductResponse } from "./types";
// import {
//   useCms,
//   getApplicationContext,
//   useVueContext,
// } from "@shopware-pwa/composables";
import { useCms, useShopwareContext } from ".";
import {
  invokePost,
  getProductEndpoint,
} from "@shopware-pwa/shopware-6-client";
import { getTranslatedProperty } from "@shopware-pwa/helpers-next";

/**
 * interface for {@link useProductConfigurator} composable
 * @beta
 */
export interface IUseProductConfigurator {
  /**
   * Handler for action when the selected option is changed
   */
  handleChange: (
    attribute: string,
    option: string,
    onChangeHandled?: () => void
  ) => Promise<void>;

  findVariantForSelectedOptions: (options?: {
    [key: string]: string;
  }) => Promise<Product | undefined>;
  /**
   * Indicates if the options are being (re)loaded
   */
  isLoadingOptions: Ref<boolean>;
  /**
   * Object of currently selected options
   */
  getSelectedOptions: ComputedRef<{
    [key: string]: string;
  }>;
  /**
   * All assigned properties which the variant can be made of
   */
  getOptionGroups: ComputedRef<PropertyGroup[]>;
}

/**
 * Product options - {@link IUseAddToCart}
 * @beta
 */
export function useProductConfigurator(params: {
  product: Ref<Product> | Product;
}): IUseProductConfigurator {
  const COMPOSABLE_NAME = "useProductConfigurator";
  const contextName = COMPOSABLE_NAME;

  const product = unref(params.product);

  const { apiInstance } = useShopwareContext();
  // const { apiInstance } = getApplicationContext({ contextName });
  // const { isVueComponent } = useVueContext();

  const { page } = useCms();

  const selected = ref({} as any);
  const isLoadingOptions = ref(!!product.options?.length);
  const parentProductId = computed(() => product.parentId);
  const getOptionGroups = computed(
    () => (page.value as unknown as ProductResponse)?.configurator || []
  );

  const findGroupCodeForOption = (optionId: string) => {
    const group = getOptionGroups.value.find((optionGroup: any) => {
      const optionFound = optionGroup.options.find(
        (option: any) => option.id === optionId
      );
      return !!optionFound;
    });

    return getTranslatedProperty(group, "name");
  };

  // create a group -> optionId map
  product.optionIds?.forEach((optionId) => {
    const optionGroupCode = findGroupCodeForOption(optionId);
    if (optionGroupCode) {
      selected.value[optionGroupCode] = optionId;
    }
  });

  const findVariantForSelectedOptions = async (options?: {
    [code: string]: string;
  }): Promise<Product | undefined> => {
    const filter = [
      {
        type: "equals",
        field: "parentId",
        value: parentProductId.value,
      },
      ...Object.values(options || selected.value).map((id) => ({
        type: "equals",
        field: "optionIds",
        value: id,
      })),
    ];
    try {
      /* istanbul ignore next */
      if (apiInstance) {
        apiInstance.defaults.headers.common["sw-include-seo-urls"] = "true";
      }
      const response = await invokePost(
        {
          address: getProductEndpoint(),
          payload: {
            limit: 1,
            filter,
            includes: {
              product: ["id", "translated", "productNumber", "seoUrls"],
              seo_url: ["seoPathInfo"],
            },
            associations: {
              seoUrls: {},
            },
          },
        },
        apiInstance
      );
      return response?.data?.elements?.[0]; // return first matching product
    } catch (e) {
      console.error("SwProductDetails:findVariantForSelectedOptions", e);
    }
  };

  const handleChange = async (
    group: string,
    option: string,
    onChangeHandled?: () => void
  ): Promise<void> => {
    selected.value = Object.assign({}, selected.value, {
      [group]: option,
    });
    if (typeof onChangeHandled === "function") {
      // run passed callback
      await onChangeHandled();
    }
  };

  return {
    handleChange,
    findVariantForSelectedOptions,
    isLoadingOptions,
    getOptionGroups,
    getSelectedOptions: selected,
  };
}
